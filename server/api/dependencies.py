from fastapi import Depends, HTTPException, Header
from typing import Optional
from core.database import get_db
from core.security import verify_token
from core.config import settings

async def get_current_user(authorization: Optional[str] = Header(None), db=Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未授权")
    
    token = authorization.split(" ")[1]
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="无效token")
    
    async with db.cursor() as cursor:
        await cursor.execute("SELECT * FROM users WHERE id = %s", (int(payload["sub"]),))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="用户不存在")
        await cursor.execute("DESC users")
        columns = [col[0] for col in await cursor.fetchall()]
        return dict(zip(columns, row))

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return current_user

def get_db_config() -> dict:
    return settings.db_config
