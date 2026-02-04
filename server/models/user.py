from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class User(BaseModel):
    id: Optional[int] = None
    phone: Optional[str] = None
    wechat_openid: Optional[str] = None
    username: Optional[str] = None
    role: str = 'comm'
    status: str = 'active'
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class UserRegister(BaseModel):
    phone: str
    code: str
    username: Optional[str] = None

class UserLogin(BaseModel):
    phone: Optional[str] = None
    code: Optional[str] = None
    wechat_code: Optional[str] = None

class SendCodeRequest(BaseModel):
    phone: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
