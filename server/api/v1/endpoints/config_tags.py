"""
配置标签 API（用户维度 DIY）
每个用户拥有自己的标签配置副本，支持增删改查、启用/禁用、排序
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from core.database import get_db
from api.dependencies import get_current_user
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

SUPER_ADMIN_PHONE = "13691962610"


# ─── 请求/响应模型 ─────────────────────────────────────────────────

class TagCreateRequest(BaseModel):
    name: str
    meaning: Optional[str] = ""
    calculationLogic: Optional[str] = ""
    category: str  # 'plus' | 'minus'
    strategyType: str
    sortOrder: Optional[int] = 0


class TagUpdateRequest(BaseModel):
    id: int
    name: Optional[str] = None
    meaning: Optional[str] = None
    calculationLogic: Optional[str] = None
    category: Optional[str] = None
    strategyType: Optional[str] = None
    sortOrder: Optional[int] = None
    isEnabled: Optional[bool] = None


class TagToggleRequest(BaseModel):
    id: int
    is_update: bool = False
    threshold_value: Optional[float] = None


class TagReorderRequest(BaseModel):
    tagIds: List[int]


class TagDeleteRequest(BaseModel):
    id: int


def _row_to_tag(row: dict) -> dict:
    """将数据库行转换为前端期望的格式"""
    return {
        "id": row.get("id"),
        "name": row.get("tag_name", ""),
        "meaning": row.get("meaning", ""),
        "calculationLogic": row.get("tag_code", ""),
        "category": row.get("category", "plus"),
        "tagType": "system",
        "strategyType": row.get("strategy_type", "B1"),
        "sortOrder": row.get("sort_order", 0),
        "isEnabled": bool(row.get("is_enabled", 1)),
        "isFilter": bool(row.get("is_filter", 0)),
        "thresholdValue": float(row.get("threshold_value")) if row.get("threshold_value") is not None else None,
        "createdBy": None,
        "createdAt": str(row.get("created_at", "")),
        "updatedAt": str(row.get("updated_at", "")),
    }


async def _ensure_user_tags(db, user_id: int):
    """确保用户有自己的标签配置，如果没有则从超管复制"""
    async with db.cursor() as cursor:
        await cursor.execute(
            "SELECT COUNT(*) FROM strategy_config_tags WHERE user_id = %s",
            (user_id,)
        )
        count = (await cursor.fetchone())[0]
        if count == 0:
            # 找超管用户 id
            await cursor.execute(
                "SELECT id FROM users WHERE phone = %s LIMIT 1",
                (SUPER_ADMIN_PHONE,)
            )
            admin_row = await cursor.fetchone()
            admin_user_id = admin_row[0] if admin_row else 1

            # 从超管复制
            await cursor.execute("""
                INSERT INTO strategy_config_tags (
                    user_id, tag_name, tag_code, strategy_type, category,
                    meaning, is_enabled, is_filter, threshold_value, sort_order
                )
                SELECT %s, tag_name, tag_code, strategy_type, category,
                       meaning, is_enabled, is_filter, threshold_value, sort_order
                FROM strategy_config_tags
                WHERE user_id = %s
            """, (user_id, admin_user_id))
            await db.commit()


# ─── 路由 ──────────────────────────────────────────────────────────

@router.get("/list")
async def list_tags(
    strategyType: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """获取当前用户的标签配置列表"""
    user_id = current_user["id"]
    await _ensure_user_tags(db, user_id)

    async with db.cursor() as cursor:
        conditions = ["user_id = %s"]
        params = [user_id]
        if strategyType:
            conditions.append("strategy_type = %s")
            params.append(strategyType)
        if category:
            conditions.append("category = %s")
            params.append(category)

        where_clause = " AND ".join(conditions)
        await cursor.execute(
            f"""
            SELECT id, tag_name, tag_code, strategy_type, category,
                   meaning, is_enabled, is_filter, threshold_value, sort_order,
                   created_at, updated_at
            FROM strategy_config_tags
            WHERE {where_clause}
            ORDER BY sort_order, id
            """,
            tuple(params)
        )
        rows = await cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        data = [_row_to_tag(dict(zip(columns, row))) for row in rows]
        return data


@router.post("/create")
async def create_tag(
    req: TagCreateRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """为当前用户创建自定义标签"""
    user_id = current_user["id"]

    async with db.cursor() as cursor:
        await cursor.execute(
            """
            INSERT INTO strategy_config_tags (
                user_id, tag_name, tag_code, strategy_type, category,
                meaning, is_enabled, is_filter, sort_order
            ) VALUES (%s, %s, %s, %s, %s, %s, 1, 0, %s)
            """,
            (
                user_id, req.name, req.calculationLogic or req.name,
                req.strategyType, req.category,
                req.meaning or "", req.sortOrder or 0
            )
        )
        await db.commit()
        new_id = cursor.lastrowid

        await cursor.execute(
            """
            SELECT id, tag_name, tag_code, strategy_type, category,
                   meaning, is_enabled, is_filter, threshold_value, sort_order,
                   created_at, updated_at
            FROM strategy_config_tags WHERE id = %s
            """,
            (new_id,)
        )
        row = await cursor.fetchone()
        columns = [col[0] for col in cursor.description]
        return _row_to_tag(dict(zip(columns, row)))


@router.post("/update")
async def update_tag(
    req: TagUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """更新当前用户的标签配置"""
    user_id = current_user["id"]

    updates = []
    values = []
    if req.name is not None:
        updates.append("tag_name = %s")
        values.append(req.name)
    if req.calculationLogic is not None:
        updates.append("tag_code = %s")
        values.append(req.calculationLogic)
    if req.meaning is not None:
        updates.append("meaning = %s")
        values.append(req.meaning)
    if req.category is not None:
        updates.append("category = %s")
        values.append(req.category)
    if req.strategyType is not None:
        updates.append("strategy_type = %s")
        values.append(req.strategyType)
    if req.sortOrder is not None:
        updates.append("sort_order = %s")
        values.append(req.sortOrder)
    if req.isEnabled is not None:
        updates.append("is_enabled = %s")
        values.append(1 if req.isEnabled else 0)

    if not updates:
        raise HTTPException(status_code=400, detail="没有要更新的字段")

    values.extend([req.id, user_id])
    async with db.cursor() as cursor:
        await cursor.execute(
            f"UPDATE strategy_config_tags SET {', '.join(updates)} WHERE id = %s AND user_id = %s",
            tuple(values)
        )
        await db.commit()

        await cursor.execute(
            """
            SELECT id, tag_name, tag_code, strategy_type, category,
                   meaning, is_enabled, is_filter, threshold_value, sort_order,
                   created_at, updated_at
            FROM strategy_config_tags WHERE id = %s
            """,
            (req.id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="标签不存在")
        columns = [col[0] for col in cursor.description]
        return _row_to_tag(dict(zip(columns, row)))


@router.post("/delete")
async def delete_tag(
    req: TagDeleteRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """删除当前用户的标签配置"""
    user_id = current_user["id"]

    async with db.cursor() as cursor:
        await cursor.execute(
            "DELETE FROM strategy_config_tags WHERE id = %s AND user_id = %s",
            (req.id, user_id)
        )
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="标签不存在或无权限删除")
        return {"success": True}


@router.post("/reorder")
async def reorder_tags(
    req: TagReorderRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """批量更新标签排序"""
    user_id = current_user["id"]

    async with db.cursor() as cursor:
        for order, tag_id in enumerate(req.tagIds):
            await cursor.execute(
                "UPDATE strategy_config_tags SET sort_order = %s WHERE id = %s AND user_id = %s",
                (order, tag_id, user_id)
            )
        await db.commit()
    return {"success": True}


# ─── RESTful 风格路由（新版前端使用） ─────────────────────────────

class TagUpdateRESTRequest(BaseModel):
    tag_name: Optional[str] = None
    tag_meaning: Optional[str] = None
    calculation_logic: Optional[str] = None
    category: Optional[str] = None
    strategy_type: Optional[str] = None
    sort_order: Optional[int] = None
    is_enabled: Optional[bool] = None


@router.put("/{tag_id}")
async def update_tag_rest(
    tag_id: int,
    req: TagUpdateRESTRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """RESTful 更新标签（PUT /config-tags/{id}）"""
    user_id = current_user["id"]

    updates = []
    values = []
    if req.tag_name is not None:
        updates.append("tag_name = %s")
        values.append(req.tag_name)
    if req.calculation_logic is not None:
        updates.append("tag_code = %s")
        values.append(req.calculation_logic)
    if req.tag_meaning is not None:
        updates.append("meaning = %s")
        values.append(req.tag_meaning)
    if req.category is not None:
        updates.append("category = %s")
        values.append(req.category)
    if req.strategy_type is not None:
        updates.append("strategy_type = %s")
        values.append(req.strategy_type)
    if req.sort_order is not None:
        updates.append("sort_order = %s")
        values.append(req.sort_order)
    if req.is_enabled is not None:
        updates.append("is_enabled = %s")
        values.append(1 if req.is_enabled else 0)

    if not updates:
        raise HTTPException(status_code=400, detail="没有要更新的字段")

    values.extend([tag_id, user_id])
    async with db.cursor() as cursor:
        await cursor.execute(
            f"UPDATE strategy_config_tags SET {', '.join(updates)} WHERE id = %s AND user_id = %s",
            tuple(values)
        )
        await db.commit()

        await cursor.execute(
            """
            SELECT id, tag_name, tag_code, strategy_type, category,
                   meaning, is_enabled, is_filter, threshold_value, sort_order,
                   created_at, updated_at
            FROM strategy_config_tags WHERE id = %s
            """,
            (tag_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="标签不存在")
        columns = [col[0] for col in cursor.description]
        return {"success": True, "data": _row_to_tag(dict(zip(columns, row)))}


@router.delete("/{tag_id}")
async def delete_tag_rest(
    tag_id: int,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """RESTful 删除标签（DELETE /config-tags/{id}）"""
    user_id = current_user["id"]

    async with db.cursor() as cursor:
        await cursor.execute(
            "DELETE FROM strategy_config_tags WHERE id = %s AND user_id = %s",
            (tag_id, user_id)
        )
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="标签不存在或无权限删除")
        return {"success": True}


# ─── 兼容旧接口（保留，防止现有调用出错） ──────────────────────────

@router.post("/tags/update")
async def update_tag_legacy(req: TagToggleRequest, db=Depends(get_db)):
    """旧版标签更新接口（兼容）"""
    async with db.cursor() as cursor:
        if req.is_update and req.threshold_value is not None:
            await cursor.execute(
                "UPDATE strategy_config_tags SET threshold_value = %s WHERE id = %s",
                (req.threshold_value, req.id)
            )
        else:
            await cursor.execute(
                "UPDATE strategy_config_tags SET is_enabled = NOT is_enabled WHERE id = %s",
                (req.id,)
            )
        await db.commit()
    return {'success': True}
