from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from core.database import get_db
from api.dependencies import get_current_user

router = APIRouter()

class WatchlistAddRequest(BaseModel):
    ts_code: str
    stock_name: Optional[str] = None
    note: Optional[str] = None


@router.post("/add")
async def add_to_watchlist(
    req: WatchlistAddRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """添加股票到观察池"""
    user_id = current_user['id']

    async with db.cursor() as cursor:
        # 检查是否已存在
        await cursor.execute(
            "SELECT id FROM user_watchlist WHERE user_id = %s AND ts_code = %s",
            (user_id, req.ts_code)
        )
        existing = await cursor.fetchone()

        if existing:
            raise HTTPException(status_code=400, detail="股票已在观察池中")

        # 添加到观察池
        await cursor.execute(
            """
            INSERT INTO user_watchlist (user_id, ts_code, stock_name, note)
            VALUES (%s, %s, %s, %s)
            """,
            (user_id, req.ts_code, req.stock_name, req.note)
        )
        await db.commit()

        return {"success": True, "message": "添加成功"}


@router.delete("/remove")
async def remove_from_watchlist(
    ts_code: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """从观察池移除股票"""
    user_id = current_user['id']

    async with db.cursor() as cursor:
        await cursor.execute(
            "DELETE FROM user_watchlist WHERE user_id = %s AND ts_code = %s",
            (user_id, ts_code)
        )
        await db.commit()

        return {"success": True, "message": "移除成功"}


@router.get("/list")
async def list_watchlist(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """获取用户观察池列表"""
    user_id = current_user['id']

    async with db.cursor() as cursor:
        await cursor.execute(
            """
            SELECT id, ts_code, stock_name, note, is_active, created_at, updated_at
            FROM user_watchlist
            WHERE user_id = %s AND is_active = 1
            ORDER BY created_at DESC
            """,
            (user_id,)
        )
        rows = await cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        return {"success": True, "data": [dict(zip(columns, row)) for row in rows]}


@router.put("/update")
async def update_watchlist_note(
    ts_code: str,
    note: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """更新观察池备注或状态"""
    user_id = current_user['id']

    async with db.cursor() as cursor:
        updates = []
        values = []

        if note is not None:
            updates.append("note = %s")
            values.append(note)

        if is_active is not None:
            updates.append("is_active = %s")
            values.append(1 if is_active else 0)

        if not updates:
            raise = HTTPException(status_code=400, detail="没有要更新的字段")

        values.extend([user_id, ts_code])

        await cursor.execute(
            f"UPDATE user_watchlist SET {', '.join(updates)} WHERE user_id = %s AND ts_code = %s",
            tuple(values)
        )
        await db.commit()

        return {"success": True, "message": "更新成功"}
