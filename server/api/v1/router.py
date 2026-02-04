from fastapi import APIRouter
from api.v1.endpoints import auth, users, b1_signal, config_tags

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(b1_signal.router, prefix="/b1-signal", tags=["B1信号"])
api_router.include_router(config_tags.router, prefix="/config-tags", tags=["config-tags"])
