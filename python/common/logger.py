"""
日志管理模块
提供统一的日志配置和管理
"""

import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from typing import Optional

from .config import config


def setup_logger(
    name: str,
    log_file: Optional[str] = None,
    level: Optional[str] = None,
    console: bool = True,
    file_rotation: str = 'size'  # 'size' or 'time'
) -> logging.Logger:
    """
    设置日志记录器
    
    Args:
        name: 日志记录器名称
        log_file: 日志文件路径（相对于logs目录）
        level: 日志级别（DEBUG, INFO, WARNING, ERROR, CRITICAL）
        console: 是否输出到控制台
        file_rotation: 文件轮转方式（'size'按大小轮转, 'time'按时间轮转）
        
    Returns:
        配置好的日志记录器
    """
    # 创建日志记录器
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level or config.LOG_LEVEL))
    
    # 清除已有的处理器
    logger.handlers.clear()
    
    # 日志格式
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # 控制台处理器
    if console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
    
    # 文件处理器
    if log_file:
        log_path = config.LOGS_DIR / log_file
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        if file_rotation == 'size':
            # 按大小轮转（每个文件最大10MB，保留5个备份）
            file_handler = RotatingFileHandler(
                log_path,
                maxBytes=10 * 1024 * 1024,  # 10MB
                backupCount=5,
                encoding='utf-8'
            )
        else:
            # 按时间轮转（每天一个文件，保留30天）
            file_handler = TimedRotatingFileHandler(
                log_path,
                when='midnight',
                interval=1,
                backupCount=30,
                encoding='utf-8'
            )
        
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger


# 预定义的日志记录器
def get_data_integration_logger() -> logging.Logger:
    """获取数据集成日志记录器"""
    return setup_logger(
        'data_integration',
        'data_integration/integration.log',
        file_rotation='time'
    )


def get_tag_calculation_logger() -> logging.Logger:
    """获取标签计算日志记录器"""
    return setup_logger(
        'tag_calculation',
        'tag_calculation/calculation.log',
        file_rotation='time'
    )


def get_scheduler_logger() -> logging.Logger:
    """获取调度器日志记录器"""
    return setup_logger(
        'scheduler',
        'scheduler/scheduler.log',
        file_rotation='time'
    )


def get_notification_logger() -> logging.Logger:
    """获取通知日志记录器"""
    return setup_logger(
        'notification',
        'notification.log',
        file_rotation='size'
    )


if __name__ == '__main__':
    # 测试日志
    print("=== 测试日志模块 ===")
    
    # 测试数据集成日志
    logger1 = get_data_integration_logger()
    logger1.debug("这是一条DEBUG日志")
    logger1.info("这是一条INFO日志")
    logger1.warning("这是一条WARNING日志")
    logger1.error("这是一条ERROR日志")
    
    # 测试标签计算日志
    logger2 = get_tag_calculation_logger()
    logger2.info("标签计算日志测试")
    
    # 测试调度器日志
    logger3 = get_scheduler_logger()
    logger3.info("调度器日志测试")
    
    print("✓ 日志模块测试完成")
    print(f"日志文件保存在: {config.LOGS_DIR}")
