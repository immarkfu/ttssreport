from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from core.database import get_db
from api.dependencies import require_admin

router = APIRouter()

# 超级管理员手机号（与 user_service 保持一致）
SUPER_ADMIN_PHONE = "13691962610"


async def _get_admin_user_id(db) -> int:
    """获取超管账号的 user_id"""
    async with db.cursor() as cursor:
        await cursor.execute(
            "SELECT id FROM users WHERE phone = %s LIMIT 1",
            (SUPER_ADMIN_PHONE,)
        )
        row = await cursor.fetchone()
        return row[0] if row else 1


# ─── 运营统计 ──────────────────────────────────────────────────────

@router.get("/stats")
async def get_analytics_stats(
    date_range: int = Query(7, description="统计天数"),
    admin: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """
    获取运营统计数据：总用户数、活跃用户数、PV、UV、新增用户、每日趋势、页面分布
    """
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=date_range)

        async with db.cursor() as cursor:
            # 总用户数
            await cursor.execute("SELECT COUNT(*) FROM users WHERE status = 'active'")
            total_users = (await cursor.fetchone())[0]

            # 活跃用户数（指定时间段内有访问记录的登录用户）
            await cursor.execute(
                """
                SELECT COUNT(DISTINCT user_id)
                FROM user_access_logs
                WHERE user_id IS NOT NULL AND created_at >= %s
                """,
                (start_date,)
            )
            active_users = (await cursor.fetchone())[0] or 0

            # 总访问次数(PV)
            await cursor.execute(
                "SELECT COUNT(*) FROM user_access_logs WHERE created_at >= %s",
                (start_date,)
            )
            total_pv = (await cursor.fetchone())[0]

            # 独立访客数(UV) - 按 IP 去重
            await cursor.execute(
                """
                SELECT COUNT(DISTINCT ip_address)
                FROM user_access_logs
                WHERE created_at >= %s
                """,
                (start_date,)
            )
            total_uv = (await cursor.fetchone())[0]

            # 新增用户数
            await cursor.execute(
                """
                SELECT COUNT(*) FROM users
                WHERE status = 'active' AND created_at >= %s
                """,
                (start_date,)
            )
            new_users = (await cursor.fetchone())[0]

            # 每日 PV/UV 趋势
            await cursor.execute(
                """
                SELECT
                    DATE(created_at) AS date,
                    COUNT(DISTINCT user_id) AS active_users,
                    COUNT(*) AS page_views,
                    COUNT(DISTINCT ip_address) AS unique_visitors
                FROM user_access_logs
                WHERE created_at >= %s
                GROUP BY DATE(created_at)
                ORDER BY date ASC
                """,
                (start_date,)
            )
            daily_rows = await cursor.fetchall()
            daily_trend = [
                {
                    "date": str(r[0]),
                    "active_users": r[1],
                    "page_views": r[2],
                    "unique_visitors": r[3]
                }
                for r in daily_rows
            ]

            # 页面访问分布 Top20
            await cursor.execute(
                """
                SELECT
                    page_path,
                    COUNT(*) AS visits,
                    COUNT(DISTINCT ip_address) AS unique_visitors
                FROM user_access_logs
                WHERE created_at >= %s
                GROUP BY page_path
                ORDER BY visits DESC
                LIMIT 20
                """,
                (start_date,)
            )
            page_rows = await cursor.fetchall()
            page_visits = [
                {"page_path": r[0], "visits": r[1], "unique_visitors": r[2]}
                for r in page_rows
            ]

            return {
                "total_users": total_users,
                "active_users": active_users,
                "total_pv": total_pv,
                "total_uv": total_uv,
                "new_users": new_users,
                "daily_trend": daily_trend,
                "page_visits": page_visits,
                "date_range": date_range
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── 用户管理 ──────────────────────────────────────────────────────

@router.get("/users/list")
async def list_users(
    skip: int = Query(0),
    limit: int = Query(50),
    admin: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """获取用户列表（含观察池数量统计）"""
    async with db.cursor() as cursor:
        await cursor.execute(
            """
            SELECT
                u.id, u.phone, u.username, u.role, u.status, u.created_at,
                COUNT(w.id) AS watchlist_count
            FROM users u
            LEFT JOIN user_watchlist w ON w.user_id = u.id AND w.is_active = 1
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT %s OFFSET %s
            """,
            (limit, skip)
        )
        rows = await cursor.fetchall()
        columns = [d[0] for d in cursor.description]
        users = [dict(zip(columns, r)) for r in rows]

        await cursor.execute("SELECT COUNT(*) FROM users")
        total = (await cursor.fetchone())[0]

        return {"success": True, "data": users, "total": total}


@router.get("/watchlist/performance")
async def get_watchlist_performance(
    date_range: int = Query(30, description="统计天数"),
    admin: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """
    所有用户观察池的整体表现统计：
    - 各用户观察池股票数量
    - 入池后平均涨跌幅
    - 盈利/亏损股票数量
    """
    try:
        start_date = (datetime.now() - timedelta(days=date_range)).strftime('%Y-%m-%d')

        async with db.cursor() as cursor:
            # 各用户观察池概览
            await cursor.execute(
                """
                SELECT
                    u.id AS user_id,
                    u.username,
                    u.phone,
                    COUNT(w.id) AS total_stocks,
                    SUM(CASE WHEN b.pct_change > 0 THEN 1 ELSE 0 END) AS profit_count,
                    SUM(CASE WHEN b.pct_change <= 0 THEN 1 ELSE 0 END) AS loss_count,
                    ROUND(AVG(b.pct_change), 2) AS avg_pct_change
                FROM users u
                INNER JOIN user_watchlist w ON w.user_id = u.id AND w.is_active = 1
                LEFT JOIN b1_signal_results b ON b.ts_code = w.ts_code
                    AND b.trade_date = (
                        SELECT MAX(trade_date) FROM b1_signal_results
                    )
                GROUP BY u.id, u.username, u.phone
                ORDER BY total_stocks DESC
                """,
            )
            rows = await cursor.fetchall()
            columns = [d[0] for d in cursor.description]
            user_stats = [dict(zip(columns, r)) for r in rows]

            # 全局观察池热门股票 Top20
            await cursor.execute(
                """
                SELECT
                    w.ts_code,
                    w.stock_name,
                    COUNT(w.user_id) AS watch_count,
                    b.pct_change AS latest_pct_change,
                    b.close_price AS latest_price
                FROM user_watchlist w
                LEFT JOIN b1_signal_results b ON b.ts_code = w.ts_code
                    AND b.trade_date = (SELECT MAX(trade_date) FROM b1_signal_results)
                WHERE w.is_active = 1
                GROUP BY w.ts_code, w.stock_name, b.pct_change, b.close_price
                ORDER BY watch_count DESC
                LIMIT 20
                """
            )
            rows = await cursor.fetchall()
            columns = [d[0] for d in cursor.description]
            hot_stocks = [dict(zip(columns, r)) for r in rows]

            return {
                "user_stats": user_stats,
                "hot_stocks": hot_stocks,
                "date_range": date_range
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── 超管标签配置管理 ──────────────────────────────────────────────

class TagConfigCreate(BaseModel):
    tag_name: str
    tag_code: str
    strategy_type: str
    category: str  # 'plus' | 'minus'
    meaning: Optional[str] = ""
    is_enabled: Optional[bool] = True
    is_filter: Optional[bool] = False
    threshold_value: Optional[float] = None
    sort_order: Optional[int] = 0


class TagConfigUpdate(BaseModel):
    tag_name: Optional[str] = None
    tag_code: Optional[str] = None
    strategy_type: Optional[str] = None
    category: Optional[str] = None
    meaning: Optional[str] = None
    is_enabled: Optional[bool] = None
    is_filter: Optional[bool] = None
    threshold_value: Optional[float] = None
    sort_order: Optional[int] = None


@router.get("/tags/list")
async def list_tag_configs(
    strategy_type: Optional[str] = None,
    admin: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """获取超管的系统标签配置列表（作为所有用户的模板）"""
    admin_user_id = await _get_admin_user_id(db)

    async with db.cursor() as cursor:
        if strategy_type:
            await cursor.execute(
                """
                SELECT id, tag_name, tag_code, strategy_type, category,
                       meaning, is_enabled, is_filter, threshold_value, sort_order
                FROM strategy_config_tags
                WHERE user_id = %s AND strategy_type = %s
                ORDER BY sort_order
                """,
                (admin_user_id, strategy_type)
            )
        else:
            await cursor.execute(
                """
                SELECT id, tag_name, tag_code, strategy_type, category,
                       meaning, is_enabled, is_filter, threshold_value, sort_order
                FROM strategy_config_tags
                WHERE user_id = %s
                ORDER BY strategy_type, sort_order
                """,
                (admin_user_id,)
            )

        rows = await cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        return {"success": True, "data": [dict(zip(columns, row)) for row in rows]}


@router.post("/tags/add")
async def add_tag_config(
    req: TagConfigCreate,
    admin: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """超管添加系统标签配置（作为所有用户的模板）"""
    admin_user_id = await _get_admin_user_id(db)

    async with db.cursor() as cursor:
        await cursor.execute(
            """
            INSERT INTO strategy_config_tags (
                user_id, tag_name, tag_code, strategy_type, category,
                meaning, is_enabled, is_filter, threshold_value, sort_order
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                admin_user_id, req.tag_name, req.tag_code, req.strategy_type, req.category,
                req.meaning, 1 if req.is_enabled else 0, 1 if req.is_filter else 0,
                req.threshold_value, req.sort_order
            )
        )
        await db.commit()
        new_id = cursor.lastrowid
        return {"success": True, "message": "标签添加成功", "id": new_id}


@router.put("/tags/{tag_id}")
async def update_tag_config(
    tag_id: int,
    req: TagConfigUpdate,
    admin: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """超管更新标签配置"""
    updates = []
    values = []

    field_map = {
        'tag_name': req.tag_name,
        'tag_code': req.tag_code,
        'strategy_type': req.strategy_type,
        'category': req.category,
        'meaning': req.meaning,
        'threshold_value': req.threshold_value,
        'sort_order': req.sort_order,
    }
    for field, val in field_map.items():
        if val is not None:
            updates.append(f"{field} = %s")
            values.append(val)
    if req.is_enabled is not None:
        updates.append("is_enabled = %s")
        values.append(1 if req.is_enabled else 0)
    if req.is_filter is not None:
        updates.append("is_filter = %s")
        values.append(1 if req.is_filter else 0)

    if not updates:
        raise HTTPException(status_code=400, detail="没有要更新的字段")

    values.append(tag_id)
    async with db.cursor() as cursor:
        await cursor.execute(
            f"UPDATE strategy_config_tags SET {', '.join(updates)} WHERE id = %s",
            tuple(values)
        )
        await db.commit()
        return {"success": True, "message": "标签更新成功"}


@router.delete("/tags/{tag_id}")
async def delete_tag_config(
    tag_id: int,
    admin: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """超管删除标签配置"""
    async with db.cursor() as cursor:
        await cursor.execute(
            "DELETE FROM strategy_config_tags WHERE id = %s",
            (tag_id,)
        )
        await db.commit()
        return {"success": True, "message": "标签删除成功"}


# ─── 数据补拉与信号补算 ────────────────────────────────────────────

class BackfillRequest(BaseModel):
    start_date: Optional[str] = None  # YYYYMMDD，不填则从数据库最新日期自动推算
    end_date: Optional[str] = None    # YYYYMMDD，不填则到今天


@router.post("/backfill/data")
async def trigger_data_backfill(
    req: BackfillRequest,
    admin: dict = Depends(require_admin),
):
    """
    触发 tushare 数据增量补拉（异步后台执行）
    - 不填日期时，自动从数据库最新日期补拉到今天
    - 每个交易日约需 30-60 秒，请耐心等待
    """
    import threading
    from scheduler.tushare_job import TushareDataIntegrator
    from core.config import settings

    def _run():
        integrator = TushareDataIntegrator(
            tushare_token=settings.TUSHARE_TOKEN,
            db_config=settings.db_config
        )
        try:
            result = integrator.backfill_missing_dates(
                start_date=req.start_date,
                end_date=req.end_date
            )
            import logging
            logging.getLogger(__name__).info(f"数据补拉完成: {result}")
        finally:
            integrator.close()

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()

    return {
        "success": True,
        "message": "数据补拉任务已在后台启动，请查看服务器日志了解进度",
        "start_date": req.start_date or "自动推算",
        "end_date": req.end_date or "今天"
    }


@router.post("/backfill/b1-signals")
async def trigger_b1_backfill(
    req: BackfillRequest,
    admin: dict = Depends(require_admin),
):
    """
    触发 B1 信号批量补算（异步后台执行）
    - 不填日期时，自动从 b1_signal_results 最新日期补算到 bak_daily_data 最新日期
    - 每个交易日约需 10-30 秒
    """
    import threading
    from scheduler.b1_signal_job import backfill_b1_signals

    def _run():
        result = backfill_b1_signals(
            start_date=req.start_date,
            end_date=req.end_date
        )
        import logging
        logging.getLogger(__name__).info(f"B1信号补算完成: {result}")

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()

    return {
        "success": True,
        "message": "B1信号补算任务已在后台启动，请查看服务器日志了解进度",
        "start_date": req.start_date or "自动推算",
        "end_date": req.end_date or "bak_daily_data最新日期"
    }


@router.get("/data-status")
async def get_data_status(
    admin: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """查看各数据表的最新日期和数据量，用于判断是否需要补拉"""
    async with db.cursor() as cursor:
        await cursor.execute(
            "SELECT MAX(trade_date) as latest, MIN(trade_date) as earliest, COUNT(*) as total FROM bak_daily_data"
        )
        bak = dict(zip([d[0] for d in cursor.description], await cursor.fetchone()))

        await cursor.execute(
            "SELECT MAX(trade_date) as latest, MIN(trade_date) as earliest, COUNT(*) as total FROM stk_factor_pro_data"
        )
        stk = dict(zip([d[0] for d in cursor.description], await cursor.fetchone()))

        await cursor.execute(
            "SELECT MAX(trade_date) as latest, MIN(trade_date) as earliest, COUNT(*) as total FROM b1_signal_results"
        )
        b1 = dict(zip([d[0] for d in cursor.description], await cursor.fetchone()))

        await cursor.execute(
            "SELECT trade_date, signal_type, status, matched_stocks, duration_seconds FROM signal_calculation_log ORDER BY created_at DESC LIMIT 10"
        )
        rows = await cursor.fetchall()
        cols = [d[0] for d in cursor.description]
        recent_logs = [dict(zip(cols, r)) for r in rows]

    return {
        "bak_daily_data": bak,
        "stk_factor_pro_data": stk,
        "b1_signal_results": b1,
        "recent_signal_logs": recent_logs
    }
