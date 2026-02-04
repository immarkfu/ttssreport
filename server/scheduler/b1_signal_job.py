from services.b1_signal_service import B1SignalService
from utils.logger import setup_logger
from core.config import settings

logger = setup_logger(__name__, 'b1_signal_job.log')


def get_admin_user_id(service) -> int:
    try:
        with service.conn.cursor() as cursor:
            cursor.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
            result = cursor.fetchone()
            if result:
                return result[0]
            return 1
    except Exception as e:
        logger.warning(f"获取管理员ID失败，使用默认ID 1: {e}")
        return 1


def run_b1_signal_calculation(trade_date: str = None):
    db_config = settings.db_config
    service = B1SignalService(db_config)

    try:
        service.connect()
        B1SignalService.clear_cache()

        admin_user_id = get_admin_user_id(service)
        logger.info(f"使用管理员用户ID: {admin_user_id} 的标签配置进行计算")

        if trade_date is None:
            with service.conn.cursor() as cursor:
                cursor.execute("SELECT MAX(trade_date) as latest_date FROM bak_daily_data")
                result = cursor.fetchone()
                trade_date = result['trade_date'].strftime('%Y%m%d') if result['trade_date'] else None

            if not trade_date:
                logger.error("无法获取最新交易日期")
                return

        logger.info(f"开始计算 {trade_date} 的B1信号（定时任务，强制刷新缓存）...")

        result = service.filter_and_tag(
            trade_date=trade_date,
            custom_tags=None,
            ts_codes=None,
            save_to_db=True,
            force_refresh_cache=True,
            user_id=admin_user_id
        )

        if result['success']:
            logger.info(f"B1信号计算完成: {result['message']}，已保存 {result['saved']} 条")
        else:
            logger.warning(f"B1信号计算未产生结果: {result['message']}")

    except Exception as e:
        logger.error(f"B1信号计算任务失败: {e}", exc_info=True)
    finally:
        service.close()
