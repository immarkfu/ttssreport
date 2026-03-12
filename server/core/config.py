from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
import os


class Settings(BaseSettings):
    # 数据库配置：优先读取 DB_* 变量，兼容 docker-compose 中的 DATABASE_* 变量
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "ttssreport"
    DB_CHARSET: str = "utf8mb4"

    # docker-compose 兼容变量（DATABASE_* 前缀）
    DATABASE_HOST: Optional[str] = None
    DATABASE_PORT: Optional[int] = None
    DATABASE_USER: Optional[str] = None
    DATABASE_PASSWORD: Optional[str] = None
    DATABASE_NAME: Optional[str] = None

    TUSHARE_TOKEN: str = ""

    JWT_SECRET_KEY: str = "ttssreport_jwt_secret_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    LOG_LEVEL: str = "INFO"

    WECHAT_APP_ID: str = ""
    WECHAT_APP_SECRET: str = ""
    WECHAT_REDIRECT_URI: str = ""

    # 火山云短信配置
    VOLCENGINE_SMS_ACCESS_KEY: str = ""
    VOLCENGINE_SMS_SECRET_KEY: str = ""
    VOLCENGINE_SMS_SIGN_NAME: str = ""
    VOLCENGINE_SMS_TEMPLATE_ID: str = ""
    VOLCENGINE_SMS_ENDPOINT: str = "https://sms.volcengineapi.com"
    VOLCENGINE_SMS_REGION: str = "cn-north-1"

    def model_post_init(self, __context):
        """兼容 DATABASE_* 环境变量，覆盖 DB_* 的默认值"""
        if self.DATABASE_HOST:
            object.__setattr__(self, 'DB_HOST', self.DATABASE_HOST)
        if self.DATABASE_PORT:
            object.__setattr__(self, 'DB_PORT', self.DATABASE_PORT)
        if self.DATABASE_USER:
            object.__setattr__(self, 'DB_USER', self.DATABASE_USER)
        if self.DATABASE_PASSWORD:
            object.__setattr__(self, 'DB_PASSWORD', self.DATABASE_PASSWORD)
        if self.DATABASE_NAME:
            object.__setattr__(self, 'DB_NAME', self.DATABASE_NAME)

    @property
    def database_url(self) -> str:
        return f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset={self.DB_CHARSET}"

    @property
    def db_config(self) -> dict:
        return {
            'host': self.DB_HOST,
            'port': self.DB_PORT,
            'user': self.DB_USER,
            'password': self.DB_PASSWORD,
            'database': self.DB_NAME
        }

    class Config:
        env_file = ".env"
        # 允许额外字段（兼容旧版本）
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
