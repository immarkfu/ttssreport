#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tushare数据集成工具 - 主程序入口
"""

import os
import sys
import logging
import argparse
from datetime import datetime
import traceback

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scheduler import DataIntegrationScheduler, TradeCalendar
from data_integration_core import TushareDataIntegrator

# 尝试导入配置文件
try:
    from config import (
        TUSHARE_TOKEN, DB_CONFIG, EMAIL_CONFIG, SCHEDULER_CONFIG,
        LOG_CONFIG, INTEGRATION_CONFIG, NOTIFICATION_CONFIG
    )
except ImportError:
    print("错误: 未找到config.py文件")
    print("请复制config.example.py为config.py，并填入实际的配置信息")
    sys.exit(1)

# 配置日志
def setup_logging():
    """设置日志"""
    log_dir = LOG_CONFIG.get('log_dir', '/home/ubuntu/logs')
    os.makedirs(log_dir, exist_ok=True)
    
    log_level = getattr(logging, LOG_CONFIG.get('log_level', 'INFO'))
    
    # 创建日志格式
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    date_format = '%Y-%m-%d %H:%M:%S'
    
    # 配置根日志
    logging.basicConfig(
        level=log_level,
        format=log_format,
        datefmt=date_format,
        handlers=[
            logging.FileHandler(os.path.join(log_dir, 'data_integration.log')),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    return logging.getLogger(__name__)


logger = setup_logging()


def validate_config():
    """验证配置文件"""
    logger.info("验证配置文件...")
    
    # 验证Tushare Token
    if not TUSHARE_TOKEN or TUSHARE_TOKEN == 'a266b71c03f7666e00c6492021a3f0e8517d7242ad446d79fb363fc9':
        logger.warning("Tushare Token未配置或使用了示例值")
    
    # 验证数据库配置
    required_db_keys = ['host', 'port', 'user', 'password', 'database']
    for key in required_db_keys:
        if key not in DB_CONFIG:
            raise ValueError(f"数据库配置缺少必要字段: {key}")
    
    # 验证邮件配置
    required_email_keys = ['smtp_server', 'smtp_port', 'from_email', 'password', 'to_email']
    for key in required_email_keys:
        if key not in EMAIL_CONFIG:
            raise ValueError(f"邮件配置缺少必要字段: {key}")
    
    logger.info("配置文件验证通过")


def test_connection():
    """测试数据库连接"""
    logger.info("测试数据库连接...")
    try:
        integrator = TushareDataIntegrator(TUSHARE_TOKEN, DB_CONFIG)
        logger.info("数据库连接成功")
        integrator.close()
        return True
    except Exception as e:
        logger.error(f"数据库连接失败: {str(e)}")
        return False


def test_tushare_api():
    """测试Tushare API连接"""
    logger.info("测试Tushare API连接...")
    try:
        integrator = TushareDataIntegrator(TUSHARE_TOKEN, DB_CONFIG)
        stock_list = integrator.get_stock_list()
        logger.info(f"Tushare API连接成功，获取到{len(stock_list)}只股票")
        integrator.close()
        return True
    except Exception as e:
        logger.error(f"Tushare API连接失败: {str(e)}")
        return False


def test_trade_calendar():
    """测试交易日历"""
    logger.info("测试交易日历...")
    try:
        calendar = TradeCalendar(TUSHARE_TOKEN)
        today = datetime.now().strftime('%Y%m%d')
        
        # 测试是否为交易日
        is_trade = calendar.is_trade_date(today)
        logger.info(f"今天({today})是否为交易日: {is_trade}")
        
        # 获取最后一个交易日
        last_trade = calendar.get_last_trade_date()
        logger.info(f"最后一个交易日: {last_trade}")
        
        # 获取下一个交易日
        next_trade = calendar.get_next_trade_date()
        logger.info(f"下一个交易日: {next_trade}")
        
        return True
    except Exception as e:
        logger.error(f"交易日历测试失败: {str(e)}")
        return False


def run_integration_once(trade_date=None):
    """执行一次数据集成"""
    logger.info("=" * 80)
    logger.info("开始执行一次数据集成")
    logger.info("=" * 80)
    
    try:
        scheduler = DataIntegrationScheduler(TUSHARE_TOKEN, DB_CONFIG, EMAIL_CONFIG)
        
        if trade_date:
            logger.info(f"指定交易日期: {trade_date}")
            result = scheduler.integrator.integrate_daily_data(trade_date)
        else:
            scheduler.run_integration_task()
            result = None
        
        logger.info("=" * 80)
        logger.info("数据集成完成")
        logger.info("=" * 80)
        
        return True
    except Exception as e:
        logger.error(f"数据集成失败: {str(e)}")
        logger.error(traceback.format_exc())
        return False


def start_scheduler():
    """启动定时调度器"""
    logger.info("=" * 80)
    logger.info("启动定时调度器")
    logger.info("=" * 80)
    
    try:
        scheduler = DataIntegrationScheduler(TUSHARE_TOKEN, DB_CONFIG, EMAIL_CONFIG)
        run_time = SCHEDULER_CONFIG.get('run_time', '17:30')
        logger.info(f"每个交易日{run_time}执行一次数据集成")
        scheduler.start_scheduler(run_time=run_time)
    except Exception as e:
        logger.error(f"调度器启动失败: {str(e)}")
        logger.error(traceback.format_exc())
        sys.exit(1)


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='Tushare数据集成工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
示例:
  # 验证配置
  python3 main.py --test-config
  
  # 测试数据库连接
  python3 main.py --test-db
  
  # 测试Tushare API
  python3 main.py --test-api
  
  # 测试交易日历
  python3 main.py --test-calendar
  
  # 执行一次数据集成
  python3 main.py --run-once
  
  # 执行指定日期的数据集成
  python3 main.py --run-once --date 20240115
  
  # 启动定时调度器
  python3 main.py --start
        '''
    )
    
    parser.add_argument('--test-config', action='store_true', help='验证配置文件')
    parser.add_argument('--test-db', action='store_true', help='测试数据库连接')
    parser.add_argument('--test-api', action='store_true', help='测试Tushare API连接')
    parser.add_argument('--test-calendar', action='store_true', help='测试交易日历')
    parser.add_argument('--run-once', action='store_true', help='执行一次数据集成')
    parser.add_argument('--date', type=str, help='指定交易日期(YYYYMMDD格式)')
    parser.add_argument('--start', action='store_true', help='启动定时调度器')
    parser.add_argument('--test-all', action='store_true', help='执行所有测试')
    
    args = parser.parse_args()
    
    try:
        # 验证配置
        validate_config()
        
        # 执行测试或运行
        if args.test_all:
            logger.info("执行所有测试...")
            test_connection()
            test_tushare_api()
            test_trade_calendar()
        elif args.test_config:
            logger.info("配置文件验证通过")
        elif args.test_db:
            test_connection()
        elif args.test_api:
            test_tushare_api()
        elif args.test_calendar:
            test_trade_calendar()
        elif args.run_once:
            run_integration_once(args.date)
        elif args.start:
            start_scheduler()
        else:
            # 默认启动调度器
            start_scheduler()
    
    except Exception as e:
        logger.error(f"程序执行失败: {str(e)}")
        logger.error(traceback.format_exc())
        sys.exit(1)


if __name__ == '__main__':
    main()
