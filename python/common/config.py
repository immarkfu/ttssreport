"""
配置管理模块
统一管理所有配置项，从环境变量或配置文件读取
"""

import os
from pathlib import Path
from typing import Dict, Any
from dotenv import load_dotenv

# 加载环境变量
env_path = Path(__file__).parents[2] / '.env'
load_dotenv(dotenv_path=env_path)


class Config:
    """配置类"""
    
    # ==================== 数据库配置 ====================
    DB_HOST = os.getenv('DATABASE_HOST', 'mysql-2579b2bfcbcb-public.rds.volces.com')
    DB_PORT = int(os.getenv('DATABASE_PORT', 3306))
    DB_USER = os.getenv('DATABASE_USER', 'bestismark')
    DB_PASSWORD = os.getenv('DATABASE_PASSWORD', 'Aa123456')
    DB_NAME = os.getenv('DATABASE_NAME', 'ttssreport')
    DB_CHARSET = os.getenv('DATABASE_CHARSET', 'utf8mb4')
    
    @classmethod
    def get_db_config(cls) -> Dict[str, Any]:
        """获取数据库配置字典"""
        return {
            'host': cls.DB_HOST,
            'port': cls.DB_PORT,
            'user': cls.DB_USER,
            'password': cls.DB_PASSWORD,
            'database': cls.DB_NAME,
            'charset': cls.DB_CHARSET,
        }
    
    # ==================== Tushare配置 ====================
    TUSHARE_API_KEY = os.getenv('TUSHARE_API_KEY', 'a266b71c03f7666e00c6492021a3f0e8517d7242ad446d79fb363fc9')
    TUSHARE_TIMEOUT = int(os.getenv('TUSHARE_TIMEOUT', 30))
    TUSHARE_RETRY_COUNT = int(os.getenv('TUSHARE_RETRY_COUNT', 3))
    
    # ==================== 邮件配置 ====================
    SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.126.com')
    SMTP_PORT = int(os.getenv('SMTP_PORT', 465))
    SMTP_USER = os.getenv('SMTP_USER', 'bestismark@126.com')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
    SMTP_FROM = os.getenv('SMTP_FROM', 'bestismark@126.com')
    SMTP_TO = os.getenv('SMTP_TO', 'bestismark@126.com')
    SMTP_USE_SSL = os.getenv('SMTP_USE_SSL', 'true').lower() == 'true'
    
    @classmethod
    def get_smtp_config(cls) -> Dict[str, Any]:
        """获取SMTP配置字典"""
        return {
            'host': cls.SMTP_HOST,
            'port': cls.SMTP_PORT,
            'user': cls.SMTP_USER,
            'password': cls.SMTP_PASSWORD,
            'from': cls.SMTP_FROM,
            'to': cls.SMTP_TO,
            'use_ssl': cls.SMTP_USE_SSL,
        }
    
    # ==================== 应用配置 ====================
    APP_ENV = os.getenv('NODE_ENV', 'production')
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    
    # ==================== 路径配置 ====================
    BASE_DIR = Path(__file__).parents[2]
    PYTHON_DIR = BASE_DIR / 'python'
    LOGS_DIR = BASE_DIR / 'logs'
    CONFIG_DIR = BASE_DIR / 'config'
    
    # ==================== 业务配置 ====================
    # 数据保留天数
    DATA_RETENTION_DAYS = int(os.getenv('DATA_RETENTION_DAYS', 90))
    
    # 定时任务配置
    SCHEDULER_ENABLED = os.getenv('SCHEDULER_ENABLED', 'true').lower() == 'true'
    SCHEDULER_TIME = os.getenv('SCHEDULER_TIME', '17:30')  # 每日执行时间
    
    # 数据集成配置
    INTEGRATION_BATCH_SIZE = int(os.getenv('INTEGRATION_BATCH_SIZE', 7000))
    
    # 标签计算配置
    TAG_CALCULATION_BATCH_SIZE = int(os.getenv('TAG_CALCULATION_BATCH_SIZE', 1000))
    
    @classmethod
    def is_production(cls) -> bool:
        """是否为生产环境"""
        return cls.APP_ENV == 'production'
    
    @classmethod
    def is_development(cls) -> bool:
        """是否为开发环境"""
        return cls.APP_ENV == 'development'
    
    @classmethod
    def validate(cls) -> bool:
        """验证配置是否完整"""
        required_configs = [
            ('DATABASE_HOST', cls.DB_HOST),
            ('DATABASE_USER', cls.DB_USER),
            ('DATABASE_PASSWORD', cls.DB_PASSWORD),
            ('DATABASE_NAME', cls.DB_NAME),
            ('TUSHARE_API_KEY', cls.TUSHARE_API_KEY),
        ]
        
        missing_configs = []
        for name, value in required_configs:
            if not value:
                missing_configs.append(name)
        
        if missing_configs:
            print(f"缺少必要的配置项: {', '.join(missing_configs)}")
            return False
        
        return True


# 创建全局配置实例
config = Config()


if __name__ == '__main__':
    # 测试配置
    print("=== 配置信息 ===")
    print(f"环境: {config.APP_ENV}")
    print(f"数据库: {config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}")
    print(f"Tushare API Key: {config.TUSHARE_API_KEY[:20]}...")
    print(f"日志级别: {config.LOG_LEVEL}")
    print(f"定时任务: {'启用' if config.SCHEDULER_ENABLED else '禁用'}")
    print(f"执行时间: {config.SCHEDULER_TIME}")
    print(f"数据保留天数: {config.DATA_RETENTION_DAYS}")
    print(f"\n配置验证: {'通过' if config.validate() else '失败'}")
