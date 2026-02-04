from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DB_HOST: str = "xxxxxxxxxxx"
    DB_PORT: int = 3306
    DB_USER: str = "xxxxxx"
    DB_PASSWORD: str = "xxxxxxxxx"
    DB_NAME: str = "xxxxxxxxxx"
    DB_CHARSET: str = "utf8mb4"

    TUSHARE_TOKEN: str = "xxxxxxxxxxxxxxxxx"

    JWT_SECRET_KEY: str = "xxxxxxxxxxxxx"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    LOG_LEVEL: str = "INFO"

    WECHAT_APP_ID: str = ""
    WECHAT_APP_SECRET: str = ""
    WECHAT_REDIRECT_URI: str = ""

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


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
