from core.config import settings
from scheduler.tushare_job import TushareDataIntegrator
from datetime import datetime, timedelta

db_config = {
    'host': settings.DB_HOST,
    'port': settings.DB_PORT,
    'user': settings.DB_USER,
    'password': settings.DB_PASSWORD,
    'database': settings.DB_NAME
}

integrator = TushareDataIntegrator(
    tushare_token=settings.TUSHARE_TOKEN,
    db_config=db_config
)

if __name__ == "__main__":
    # 落昨天的数据
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y%m%d')
    result = integrator.integrate_daily_data(yesterday)
    integrator.close()