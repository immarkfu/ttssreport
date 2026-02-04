from fastapi import APIRouter, HTTPException, Query, Response, Cookie
from core.database import get_sync_connection
from typing import Optional
import pymysql

router = APIRouter()

COOKIE_NAME = "app_session_id"

@router.get("/me")
async def get_current_user(
    session_id: Optional[str] = Cookie(None, alias=COOKIE_NAME)
):
    if not session_id:
        return None
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
