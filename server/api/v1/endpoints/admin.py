from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from core.database import get_db
from api.dependencies import require_admin

router = APIRouter()


@router.get("/stats")
async def get_analytics_stats(
    date_range: int = Query(7, description="统计天数"),
    admin: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """
    获取运营统计数据
    - 总用户数
    - 活跃用户数
    - 总访问次数(PV)
    - 独立访客数(UV)
    - 新增用户数
    - 每日活跃用户趋势
    """
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=date_range)

        async with db.cursor() as cursor:
            # 总用户数
            await cursor.execute("SELECT COUNT(*) FROM users WHERE status = 'active'")
            total_users = (await cursor.fetchone())[0]

            # 活跃用户数（最近7天有访问记录）
            await cursor.execute(
                """
                SELECT COUNT(DISTINCT user_id)
                FROM user_access_logs
                WHERE user_id IS NOT NULL
                AND created_at >= %s
                """,
                (start_date,)
            )
            active_users = (await cursor.fetchone())[0] or 0

            # 总访问次数(PV)
            await cursor.execute(
                """
                SELECT COUNT(*)
                FROM user_access_logs
                WHERE created_at >= %s
                """,
                (start_date,)
            )
            total_pv = (await cursor.fetchone())[0]

            # 独立访客数(UV)
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
                SELECT COUNT(*)
                FROM users
                WHERE status = 'active'
                AND created_at >= %s
                """,
                (start_date,)
            )
            new_users = (await cursor.fetchone())[0]

            # 每日活跃用户趋势
            await cursor.execute(
                """
                SELECT
                    DATE(created_at) as date,
                    COUNT(DISTINCT user_id) as active_users,
                    COUNT(*) as page_views
                FROM user_access_logs
                WHERE created_at >= %s
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                """,
                (start_date,)
            )
            daily_trend = await cursor.fetchall()

            # 页面访问分布
            await cursor.execute(
                """
                SELECT
                    page_path,
                    page_title,
                    COUNT(*) as visits,
                    COUNT(DISTINCT user_id) as unique_visitors
                FROM user_access_logs
                WHERE created_at >= %s
                GROUP BY page_path, page_title
                ORDER BY visits DESC
                LIMIT 20
                """,
                (start_date,)
            )
            page_visits = await cursor.fetchall()

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


@router.post("/tags/add")
async def add_tag_config(
    req: TagConfigUpdate,
    admin: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """添加系统标签配置"""
    async with db.cursor() as cursor:
        await cursor.execute(
            """
            INSERT INTO strategy_config_tags (
                user_id, tag_name, tag_code, strategy_type, category,
                meaning, is_enabled, is_filter, threshold_value, sort_order
            ) VALUES (1, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                req.tag_name, req.tag_code, req.strategy_type, req.category,
                req.meaning, req.is_enabled, req.is_filter, req.threshold_value,
                req.sort_order
            )
        )
        await db.commit()

        return {"success": True, "message": "标签添加成功"}


@router.put("/tags/{tag_id}")
async def update_tag_config(
    tag_id: int,
    req: TagConfigUpdate,
    admin: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """更新系统标签配置"""
    updates = []
    values = []

    if req.tag_name is not None:
        updates.append("tag_name = %s")
        values.append(req.tag_name)
    if req.tag_code is not None:
        updates.append("tag_code = %s")
        values.append(req.tag_code)
    if req.strategy_type is not None:
        updates.append("strategy_type = %s")
        values.append(req.strategy_type)
    if req.category is not None:
        updates.append("category = %s")
        values.append(req.category)
    if req.meaning is not None:
        updates.append("meaning = %s")
        values.append(req.meaning)
    if req.is_enabled is not None:
        updates.append("is_enabled = %s")
        values.append(1 if req.is_enabled else 0)
    if req.is_filter is not None:
        updates.append("is_filter = %s")
        values.append(1 if req.is_filter else 0)
    if req.threshold_value is not None:
        updates.append("threshold_value = %s")
        values.append(req.threshold_value)
    if req.sort_order is not None:
        updates.append("sort_order = %s")
        values.append(req.sort_order)

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
    """删除系统标签配置"""
    async with db.cursor() as cursor:
        await cursor.execute(
            "DELETE FROM strategy_config_tags WHERE id = %s",
            (tag_id,)
        )
        await db.commit()

        return {"success": True, "message": "标签删除成功"}


@router.get("/tags/list")
async def list_tag_configs(
    strategy_type: Optional[str] = None,
    admin: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """获取系统标签配置列表"""
    async with db.cursor() as cursor:
        if strategy_type:
            await cursor.execute(
                """
                SELECT id, tag_name, tag_code, strategy_type, category,
                       meaning, is_enabled, is_filter, threshold_value, sort_order
                FROM strategy_config_tags
                WHERE user_id = 1 AND strategy_type = %s
                ORDER BY sort_order
                """,
                (strategy_type,)
            )
        else:
            await cursor.execute(
                """
                SELECT id, tag_name, tag_code, strategy_type, category,
                       meaning, is_enabled, is_filter, threshold_value, sort_order
                FROM strategy_config_tags
                WHERE user_id = 1
                ORDER BY strategy_type, sort_order
                """
            )

        rows = await cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        return {"success": True, "data": [dict(zip(columns, row)) for row in rows]}


class UserPermissionUpdate(BaseModel):
    can_view_b1: Optional[bool] = None
    can_view_s1: Optional[bool] = None
    can_view_watchlist: Optional[bool] = None
    can_view_config: Optional[bool] = None


@router.put("/users/{user_id}/permissions")
async def update_user_permissions(
    user_id: int,
    req: UserPermissionUpdate,
    admin: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """更新用户页面权限"""
    # TODO: 需要在 users 表添加权限字段，或在 user_permissions 表中存储
    return {"success": True, "message": "权限更新成功"}


@router.get("/users/permissions")
async def list_user_permissions(
    admin: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """获取所有用户权限列表"""
    # TODO: 返回用户权限列表
    return {"success": True, "data": []}
