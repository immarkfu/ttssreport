import aiomysql
import pymysql
from dbutils.pooled_db import PooledDB
from core.config import settings

# 异步连接池（供中间件和 API 使用）
_async_pool = None

async def get_db_pool() -> aiomysql.Pool:
    """获取或创建异步连接池"""
    global _async_pool
    if _async_pool is None:
        _async_pool = await aiomysql.create_pool(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            db=settings.DB_NAME,
            charset=settings.DB_CHARSET,
            minsize=2,
            maxsize=20,
            autocommit=False
        )
    return _async_pool

async def get_db_connection():
    conn = await aiomysql.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        db=settings.DB_NAME,
        charset=settings.DB_CHARSET
    )
    return conn

async def get_db():
    conn = await get_db_connection()
    try:
        yield conn
    finally:
        conn.close()

_sync_pool = None

def get_sync_pool() -> PooledDB:
    global _sync_pool
    if _sync_pool is None:
        _sync_pool = PooledDB(
            creator=pymysql,
            maxconnections=20,
            mincached=2,
            maxcached=10,
            blocking=True,
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME,
            charset=settings.DB_CHARSET
        )
    return _sync_pool

def get_sync_connection():
    return get_sync_pool().connection()
