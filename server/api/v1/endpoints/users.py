from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from typing import Optional
from models.user import UserRegister, UserLogin, SendCodeRequest, UserUpdate
from services.user_service import UserService
from core.database import get_db
from core.config import settings
from api.dependencies import get_current_user, require_admin
from urllib.parse import urlencode

router = APIRouter()

@router.post("/send-code")
async def send_code(request: SendCodeRequest, db=Depends(get_db)):
    service = UserService(db)
    success = await service.send_verification_code(request.phone)
    if success:
        return {"message": "验证码已发送"}
    raise HTTPException(status_code=400, detail="发送失败")

@router.post("/register")
async def register(user_data: UserRegister, db=Depends(get_db)):
    service = UserService(db)
    user = await service.register(user_data.phone, user_data.code, user_data.username)
    if user:
        return user
    raise HTTPException(status_code=400, detail="注册失败")

@router.post("/login")
async def login(login_data: UserLogin, db=Depends(get_db)):
    service = UserService(db)
    
    if login_data.phone and login_data.code:
        result = await service.login_by_phone(login_data.phone, login_data.code)
    elif login_data.wechat_code:
        result = await service.login_by_wechat(login_data.wechat_code)
    else:
        raise HTTPException(status_code=400, detail="参数错误")
    
    if result:
        print(result)
        return result
    raise HTTPException(status_code=401, detail="登录失败")

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.get("/list")
async def list_users(
    skip: int = 0,
    limit: int = 100,
    admin: dict = Depends(require_admin),
    db=Depends(get_db)
):
    service = UserService(db)
    users = await service.get_users(skip, limit)
    return {"users": users, "total": len(users)}

@router.put("/{user_id}")
async def update_user(
    user_id: int,
    update_data: UserUpdate,
    admin: dict = Depends(require_admin),
    db=Depends(get_db)
):
    service = UserService(db)
    user = await service.update_user(
        user_id,
        username=update_data.username,
        role=update_data.role,
        status=update_data.status
    )
    if user:
        return user
    raise HTTPException(status_code=404, detail="用户不存在")

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    admin: dict = Depends(require_admin),
    db=Depends(get_db)
):
    service = UserService(db)
    success = await service.delete_user(user_id)
    if success:
        return {"message": "删除成功"}
    raise HTTPException(status_code=404, detail="用户不存在")

@router.get("/wechat/login-url")
async def get_wechat_login_url(state: str = ""):
    params = {
        "appid": settings.WECHAT_APP_ID,
        "redirect_uri": settings.WECHAT_REDIRECT_URI,
        "response_type": "code",
        "scope": "snsapi_login",
        "state": state
    }
    url = f"https://open.weixin.qq.com/connect/qrconnect?{urlencode(params)}#wechat_redirect"
    return {"url": url}

@router.get("/wechat/callback")
async def wechat_callback(code: str, state: Optional[str] = None, db=Depends(get_db)):
    service = UserService(db)
    result = await service.login_by_wechat(code)
    
    if result:
        token = result["token"]
        return RedirectResponse(url=f"{settings.WECHAT_REDIRECT_URI.split('/api')[0]}/wechat-success?token={token}")
    
    raise HTTPException(status_code=401, detail="微信登录失败")
