from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import schedule
import time
import threading
import asyncio
from datetime import datetime
from scheduler.tushare_job import TushareDataIntegrator
from scheduler.b1_signal_job import run_b1_signal_calculation
from core.config import settings
from core.database import get_db_pool
from utils.logger import setup_logger
from api.v1.router import api_router
from core.security import verify_token

logger = setup_logger(__name__, 'main.log')


def run_daily_jobs():
    try:
        logger.info("=" * 80)
        logger.info(f"开始执行每日定时任务 - {datetime.now()}")

        integrator = TushareDataIntegrator(
            tushare_token=settings.TUSHARE_TOKEN,
            db_config=settings.db_config
        )

        trade_date = datetime.now().strftime('%Y%m%d')
        result = integrator.integrate_daily_data(trade_date)
        logger.info(f"基础数据落库完成: {result}")
        integrator.close()

        logger.info("步骤2：开始执行B1信号计算...")
        run_b1_signal_calculation()
        logger.info("B1信号计算完成")

        logger.info(f"每日定时任务执行完成 - {datetime.now()}")
        logger.info("=" * 80)

    except Exception as e:
        logger.error(f"每日定时任务执行失败: {e}", exc_info=True)


def schedule_jobs():
    logger.info("TTSS Report Backend API 启动")
    # 受限于股票技术因子(专业版落库时间在20:30之后，而备用行情数据在17:30)
    schedule.every().day.at("20:35").do(run_daily_jobs)
    logger.info("定时任务已配置：每天20:35执行数据落库和B1信号计算")

    while True:
        schedule.run_pending()
        time.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler_thread = threading.Thread(target=schedule_jobs, daemon=True)
    scheduler_thread.start()
    logger.info("定时任务线程已启动")
    yield


app = FastAPI(
    title="TTSS Report Backend API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── PV/UV 访问日志中间件 ──────────────────────────────────────────
# 不记录的路径前缀（健康检查、静态资源等）
_SKIP_LOG_PREFIXES = ("/api/v1/auth/", "/docs", "/openapi", "/redoc", "/favicon")

@app.middleware("http")
async def access_log_middleware(request: Request, call_next):
    response = await call_next(request)

    path = request.url.path
    # 只记录 GET 请求的页面浏览，跳过不必要的路径
    if request.method == "GET" and not any(path.startswith(p) for p in _SKIP_LOG_PREFIXES):
        try:
            # 解析 token 获取 user_id（游客为 None）
            user_id = None
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                payload = verify_token(token)
                if payload:
                    user_id = int(payload.get("sub", 0)) or None

            ip_address = request.headers.get("X-Real-IP") or request.client.host
            user_agent = request.headers.get("User-Agent", "")[:500]
            referer = request.headers.get("Referer", "")[:500]

            # 异步写入访问日志（不阻塞响应）
            asyncio.create_task(_write_access_log(
                user_id=user_id,
                page_path=path[:200],
                page_title="",
                referer=referer,
                user_agent=user_agent,
                ip_address=ip_address
            ))
        except Exception:
            pass  # 日志写入失败不影响正常响应

    return response


async def _write_access_log(user_id, page_path, page_title, referer, user_agent, ip_address):
    """异步写入访问日志到 user_access_logs 表"""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """
                    INSERT INTO user_access_logs
                        (user_id, page_path, page_title, referer, user_agent, ip_address)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (user_id, page_path, page_title, referer, user_agent, ip_address)
                )
                await conn.commit()
    except Exception as e:
        logger.debug(f"访问日志写入失败: {e}")


app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "TTSS Report Backend API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
