from fastapi import APIRouter
from api.v1.endpoints import auth, users, b1_signal, config_tags, market_overview, watchlist, admin

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(b1_signal.router, prefix="/b1-signal", tags=["B1信号"])
api_router.include_router(config_tags.router, prefix="/config-tags", tags=["config-tags"])
api_router.include_router(market_overview.router, prefix="/market", tags=["市场概览"])
api_router.include_router(watchlist.router, prefix="/watchlist", tags=["观察池"])
api_router.include_router(admin.router, prefix="/admin", tags=["管理员后台"])
