from fastapi import APIRouter, HTTPException, Response, Cookie, Header, Depends
from core.database import get_sync_connection, get_db
from core.security import verify_token
from typing import Optional
import pymysql

router = APIRouter()

COOKIE_NAME = "app_session_id"


@router.get("/me")
async def get_current_user(
    authorization: Optional[str] = Header(None),
    session_id: Optional[str] = Cookie(None, alias=COOKIE_NAME),
    db=Depends(get_db)
):
    """
    获取当前登录用户信息，支持 Bearer Token 和 Cookie 两种认证方式。
    未登录时返回 null（不抛出 401，前端自行处理跳转）。
    """
    token = None

    # 优先从 Authorization header 取 Bearer token
    if authorization and authorization.startswith("Bearer "):
        raw = authorization.split(" ", 1)[1].strip()
        # 过滤掉前端写死的游客 token
        if raw and raw not in ("guest_token", "null", "undefined"):
            token = raw

    # 其次从 Cookie 取
    if not token and session_id:
        token = session_id

    if not token:
        return None

    payload = verify_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    try:
        async with db.cursor() as cursor:
            await cursor.execute("SELECT * FROM users WHERE id = %s AND status = 'active'", (int(user_id),))
            row = await cursor.fetchone()
            if not row:
                return None
            await cursor.execute("DESC users")
            columns = [col[0] for col in await cursor.fetchall()]
            return dict(zip(columns, row))
    except Exception:
        return None


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(COOKIE_NAME)
    return {"success": True}


@router.get("/latest-trade")
async def get_latest_trade_date():
    conn = None
    try:
        conn = get_sync_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)

        sql = "SELECT MAX(trade_date) as latest_date FROM bak_daily_data"
        cursor.execute(sql)
        result = cursor.fetchone()
        cursor.close()

        latest_date = result['latest_date'] if result and result['latest_date'] else None

        if latest_date:
            formatted_date = f"{latest_date[:4]}/{latest_date[4:6]}/{latest_date[6:8]}"
            return {'success': True, 'latest_trade_date': formatted_date}
        else:
            return {'success': True, 'latest_trade_date': None, 'message': '暂无交易数据'}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()
