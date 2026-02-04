from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import schedule
import time
import threading
from datetime import datetime
from scheduler.tushare_job import TushareDataIntegrator
from scheduler.b1_signal_job import run_b1_signal_calculation
from core.config import settings
from utils.logger import setup_logger
from api.v1.router import api_router

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

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "TTSS Report Backend API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
