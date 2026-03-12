"""
观察池管理 API
用户可将感兴趣的股票加入观察池，并查看入池后的表现统计
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from core.database import get_db
from api.dependencies import get_current_user
import json

router = APIRouter()


class WatchlistAddRequest(BaseModel):
    ts_code: str
    stock_name: Optional[str] = None
    note: Optional[str] = None


class WatchlistUpdateRequest(BaseModel):
    ts_code: str
    note: Optional[str] = None
    is_active: Optional[bool] = None


@router.post("/add")
async def add_to_watchlist(
    req: WatchlistAddRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """添加股票到观察池"""
    user_id = current_user['id']

    async with db.cursor() as cursor:
        # 检查是否已存在（含已软删除的）
        await cursor.execute(
            "SELECT id, is_active FROM user_watchlist WHERE user_id = %s AND ts_code = %s",
            (user_id, req.ts_code)
        )
        existing = await cursor.fetchone()

        if existing:
            if existing[1] == 1:
                raise HTTPException(status_code=400, detail="股票已在观察池中")
            else:
                # 重新激活
                await cursor.execute(
                    "UPDATE user_watchlist SET is_active = 1, note = %s, updated_at = NOW() WHERE id = %s",
                    (req.note, existing[0])
                )
                await db.commit()
                return {"success": True, "message": "已重新加入观察池"}

        # 如果未提供股票名称，尝试从 stock_list 查询
        stock_name = req.stock_name
        if not stock_name:
            await cursor.execute(
                "SELECT name FROM stock_list WHERE ts_code = %s LIMIT 1",
                (req.ts_code,)
            )
            name_row = await cursor.fetchone()
            if name_row:
                stock_name = name_row[0]

        await cursor.execute(
            """
            INSERT INTO user_watchlist (user_id, ts_code, stock_name, note, is_active)
            VALUES (%s, %s, %s, %s, 1)
            """,
            (user_id, req.ts_code, stock_name, req.note)
        )
        await db.commit()
        return {"success": True, "message": "添加成功"}


@router.delete("/remove")
async def remove_from_watchlist(
    ts_code: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """从观察池移除股票（软删除）"""
    user_id = current_user['id']

    async with db.cursor() as cursor:
        await cursor.execute(
            "UPDATE user_watchlist SET is_active = 0, updated_at = NOW() WHERE user_id = %s AND ts_code = %s",
            (user_id, ts_code)
        )
        await db.commit()
        return {"success": True, "message": "移除成功"}


@router.get("/list")
async def list_watchlist(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    获取用户观察池列表，附带最新 B1 信号数据（最新交易日的涨跌幅、信号标签等）
    """
    user_id = current_user['id']

    async with db.cursor() as cursor:
        await cursor.execute(
            """
            SELECT
                w.id,
                w.ts_code,
                w.stock_name,
                w.note,
                w.is_active,
                w.created_at,
                w.updated_at,
                b.trade_date        AS latest_trade_date,
                b.close_price       AS latest_close,
                b.pct_change        AS latest_pct_change,
                b.tag_score         AS latest_tag_score,
                b.matched_tag_names AS latest_tags
            FROM user_watchlist w
            LEFT JOIN b1_signal_results b
                ON b.ts_code = w.ts_code
                AND b.trade_date = (SELECT MAX(trade_date) FROM b1_signal_results)
            WHERE w.user_id = %s AND w.is_active = 1
            ORDER BY w.created_at DESC
            """,
            (user_id,)
        )
        rows = await cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        data = []
        for row in rows:
            item = dict(zip(columns, row))
            # 解析 JSON 字段
            if item.get('latest_tags') and isinstance(item['latest_tags'], str):
                try:
                    item['latest_tags'] = json.loads(item['latest_tags'])
                except Exception:
                    item['latest_tags'] = []
            # 格式化日期
            for date_field in ('created_at', 'updated_at', 'latest_trade_date'):
                if item.get(date_field) and not isinstance(item[date_field], str):
                    item[date_field] = str(item[date_field])
            data.append(item)

        return {"success": True, "data": data, "total": len(data)}


@router.put("/update")
async def update_watchlist_note(
    req: WatchlistUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """更新观察池备注或状态"""
    user_id = current_user['id']

    updates = []
    values = []

    if req.note is not None:
        updates.append("note = %s")
        values.append(req.note)
    if req.is_active is not None:
        updates.append("is_active = %s")
        values.append(1 if req.is_active else 0)

    if not updates:
        raise HTTPException(status_code=400, detail="没有要更新的字段")

    updates.append("updated_at = NOW()")
    values.extend([user_id, req.ts_code])

    async with db.cursor() as cursor:
        await cursor.execute(
            f"UPDATE user_watchlist SET {', '.join(updates)} WHERE user_id = %s AND ts_code = %s",
            tuple(values)
        )
        await db.commit()
        return {"success": True, "message": "更新成功"}


@router.get("/performance")
async def get_watchlist_performance(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    获取当前用户观察池的整体表现统计：
    - 入池股票总数
    - 最新交易日有信号的股票数
    - 平均涨跌幅
    - 盈利/亏损股票数量
    - 各股票的入池后历史信号走势
    """
    user_id = current_user['id']

    async with db.cursor() as cursor:
        # 观察池基本统计
        await cursor.execute(
            """
            SELECT
                COUNT(*) AS total_stocks,
                SUM(CASE WHEN b.pct_change > 0 THEN 1 ELSE 0 END) AS profit_count,
                SUM(CASE WHEN b.pct_change < 0 THEN 1 ELSE 0 END) AS loss_count,
                SUM(CASE WHEN b.pct_change = 0 OR b.pct_change IS NULL THEN 1 ELSE 0 END) AS flat_count,
                ROUND(AVG(b.pct_change), 2) AS avg_pct_change,
                MAX(b.trade_date) AS latest_trade_date
            FROM user_watchlist w
            LEFT JOIN b1_signal_results b
                ON b.ts_code = w.ts_code
                AND b.trade_date = (SELECT MAX(trade_date) FROM b1_signal_results)
            WHERE w.user_id = %s AND w.is_active = 1
            """,
            (user_id,)
        )
        row = await cursor.fetchone()
        columns = [col[0] for col in cursor.description]
        summary = dict(zip(columns, row)) if row else {}

        # 各股票最近5个交易日的信号数据
        await cursor.execute(
            """
            SELECT
                w.ts_code,
                w.stock_name,
                b.trade_date,
                b.close_price,
                b.pct_change,
                b.tag_score
            FROM user_watchlist w
            INNER JOIN b1_signal_results b ON b.ts_code = w.ts_code
            WHERE w.user_id = %s AND w.is_active = 1
              AND b.trade_date IN (
                  SELECT DISTINCT trade_date FROM b1_signal_results
                  ORDER BY trade_date DESC LIMIT 5
              )
            ORDER BY w.ts_code, b.trade_date DESC
            """,
            (user_id,)
        )
        rows = await cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        history = [dict(zip(columns, r)) for r in rows]
        # 格式化日期
        for item in history:
            for f in ('trade_date',):
                if item.get(f) and not isinstance(item[f], str):
                    item[f] = str(item[f])

        return {
            "success": True,
            "summary": summary,
            "history": history
        }


@router.get("/check")
async def check_in_watchlist(
    ts_code: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """检查某只股票是否在当前用户的观察池中"""
    user_id = current_user['id']

    async with db.cursor() as cursor:
        await cursor.execute(
            "SELECT id FROM user_watchlist WHERE user_id = %s AND ts_code = %s AND is_active = 1",
            (user_id, ts_code)
        )
        row = await cursor.fetchone()
        return {"in_watchlist": row is not None}
