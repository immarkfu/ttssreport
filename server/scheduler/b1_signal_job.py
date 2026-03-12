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


def backfill_b1_signals(start_date: str = None, end_date: str = None):
    """
    批量补算缺失日期的 B1 信号（用于补全历史信号缺口）
    Args:
        start_date: 开始日期(YYYYMMDD)，默认从 b1_signal_results 最新日期的下一个交易日开始
        end_date: 结束日期(YYYYMMDD)，默认为 bak_daily_data 最新日期
    """
    import pymysql
    from datetime import datetime, timedelta

    db_config = settings.db_config
    service = B1SignalService(db_config)

    try:
        service.connect()
        B1SignalService.clear_cache()
        admin_user_id = get_admin_user_id(service)

        with service.conn.cursor() as cursor:
            # 确定补算范围
            if end_date is None:
                cursor.execute("SELECT MAX(trade_date) as latest FROM bak_daily_data")
                row = cursor.fetchone()
                end_date = row['latest'].strftime('%Y%m%d') if row and row['latest'] else datetime.now().strftime('%Y%m%d')

            if start_date is None:
                cursor.execute("SELECT MAX(trade_date) as latest FROM b1_signal_results")
                row = cursor.fetchone()
                if row and row['latest']:
                    next_dt = row['latest'] + timedelta(days=1)
                    start_date = next_dt.strftime('%Y%m%d')
                else:
                    start_date = (datetime.now() - timedelta(days=30)).strftime('%Y%m%d')

            # 获取需要补算的交易日列表（bak_daily_data 中有数据的日期）
            cursor.execute(
                "SELECT DISTINCT trade_date FROM bak_daily_data "
                "WHERE trade_date >= %s AND trade_date <= %s "
                "ORDER BY trade_date",
                (start_date, end_date)
            )
            rows = cursor.fetchall()
            trade_dates = [r['trade_date'].strftime('%Y%m%d') if hasattr(r['trade_date'], 'strftime') else str(r['trade_date']) for r in rows]

        if not trade_dates:
            logger.info("没有需要补算 B1 信号的交易日")
            return {'success': True, 'message': '没有需要补算的交易日', 'total': 0}

        logger.info(f"开始批量补算 B1 信号：{len(trade_dates)} 个交易日 ({start_date} ~ {end_date})")

        success_count = 0
        for trade_date in trade_dates:
            try:
                logger.info(f"补算 {trade_date} 的 B1 信号...")
                result = service.filter_and_tag(
                    trade_date=trade_date,
                    custom_tags=None,
                    ts_codes=None,
                    save_to_db=True,
                    force_refresh_cache=True,
                    user_id=admin_user_id
                )
                if result['success']:
                    logger.info(f"{trade_date} B1 信号补算完成，保存 {result.get('saved', 0)} 条")
                    success_count += 1
                else:
                    logger.warning(f"{trade_date} B1 信号补算未产生结果: {result.get('message', '')}")
            except Exception as e:
                logger.error(f"{trade_date} B1 信号补算失败: {e}", exc_info=True)

        logger.info(f"批量补算完成：{success_count}/{len(trade_dates)} 个交易日成功")
        return {
            'success': True,
            'total': len(trade_dates),
            'success_count': success_count,
            'dates': trade_dates
        }

    except Exception as e:
        logger.error(f"B1 信号批量补算失败: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}
    finally:
        service.close()
