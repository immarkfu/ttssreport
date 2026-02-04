from fastapi import APIRouter, HTTPException, Query, Depends
from core.database import get_db
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class TagUpdateRequest(BaseModel):
    user_id: int
    id: int
    threshold_value: Optional[float] = None
    is_update: bool

@router.get("/list")
async def list_tags(user_id: int = Query(..., description="用户ID"), db=Depends(get_db)):
    async with db.cursor() as cursor:
        await cursor.execute("""
            SELECT id, tag_name, tag_code, strategy_type, category,
                   is_enabled, threshold_value, sort_order, is_filter
            FROM strategy_config_tags
            WHERE user_id = %s and strategy_type = 'B1'
            ORDER BY sort_order
        """, (user_id,))
        rows = await cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        return {'success': True, 'data': [dict(zip(columns, row)) for row in rows]}

@router.post("/tags/update")
async def update_tag(req: TagUpdateRequest, db=Depends(get_db)):
    async with db.cursor() as cursor:
        if req.is_update:
            await cursor.execute(
                "UPDATE strategy_config_tags SET threshold_value = %s WHERE id = %s AND user_id = %s",
                (req.threshold_value, req.id, req.user_id)
            )
        else:
            await cursor.execute(
                "UPDATE strategy_config_tags SET is_enabled = NOT is_enabled WHERE id = %s AND user_id = %s",
                (req.id, req.user_id)
            )
        await db.commit()
    return {'success': True}
