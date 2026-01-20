"""
数据库连接模块
提供统一的数据库连接和操作接口
"""

import pymysql
from pymysql.cursors import DictCursor
from contextlib import contextmanager
from typing import Optional, Dict, Any, List
import logging

from .config import config

logger = logging.getLogger(__name__)


class Database:
    """数据库连接类"""
    
    def __init__(self, db_config: Optional[Dict[str, Any]] = None):
        """
        初始化数据库连接
        
        Args:
            db_config: 数据库配置字典，如果为None则使用全局配置
        """
        self.db_config = db_config or config.get_db_config()
        self.connection: Optional[pymysql.Connection] = None
    
    def connect(self) -> pymysql.Connection:
        """
        建立数据库连接
        
        Returns:
            数据库连接对象
        """
        try:
            self.connection = pymysql.connect(
                **self.db_config,
                cursorclass=DictCursor,
                autocommit=False
            )
            logger.info(f"数据库连接成功: {self.db_config['host']}:{self.db_config['port']}/{self.db_config['database']}")
            return self.connection
        except Exception as e:
            logger.error(f"数据库连接失败: {e}")
            raise
    
    def close(self):
        """关闭数据库连接"""
        if self.connection:
            self.connection.close()
            self.connection = None
            logger.info("数据库连接已关闭")
    
    def is_connected(self) -> bool:
        """检查是否已连接"""
        return self.connection is not None and self.connection.open
    
    def ensure_connected(self):
        """确保数据库已连接"""
        if not self.is_connected():
            self.connect()
    
    def execute(self, sql: str, params: Optional[tuple] = None) -> int:
        """
        执行SQL语句（INSERT, UPDATE, DELETE）
        
        Args:
            sql: SQL语句
            params: 参数元组
            
        Returns:
            影响的行数
        """
        self.ensure_connected()
        try:
            with self.connection.cursor() as cursor:
                affected_rows = cursor.execute(sql, params)
                self.connection.commit()
                return affected_rows
        except Exception as e:
            self.connection.rollback()
            logger.error(f"SQL执行失败: {sql}, 错误: {e}")
            raise
    
    def executemany(self, sql: str, params_list: List[tuple]) -> int:
        """
        批量执行SQL语句
        
        Args:
            sql: SQL语句
            params_list: 参数列表
            
        Returns:
            影响的行数
        """
        self.ensure_connected()
        try:
            with self.connection.cursor() as cursor:
                affected_rows = cursor.executemany(sql, params_list)
                self.connection.commit()
                return affected_rows
        except Exception as e:
            self.connection.rollback()
            logger.error(f"批量SQL执行失败: {sql}, 错误: {e}")
            raise
    
    def query(self, sql: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """
        查询数据
        
        Args:
            sql: SQL查询语句
            params: 参数元组
            
        Returns:
            查询结果列表
        """
        self.ensure_connected()
        try:
            with self.connection.cursor() as cursor:
                cursor.execute(sql, params)
                results = cursor.fetchall()
                return results
        except Exception as e:
            logger.error(f"SQL查询失败: {sql}, 错误: {e}")
            raise
    
    def query_one(self, sql: str, params: Optional[tuple] = None) -> Optional[Dict[str, Any]]:
        """
        查询单条数据
        
        Args:
            sql: SQL查询语句
            params: 参数元组
            
        Returns:
            查询结果字典，如果没有结果则返回None
        """
        self.ensure_connected()
        try:
            with self.connection.cursor() as cursor:
                cursor.execute(sql, params)
                result = cursor.fetchone()
                return result
        except Exception as e:
            logger.error(f"SQL查询失败: {sql}, 错误: {e}")
            raise
    
    def call_procedure(self, proc_name: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """
        调用存储过程
        
        Args:
            proc_name: 存储过程名称
            params: 参数元组
            
        Returns:
            查询结果列表
        """
        self.ensure_connected()
        try:
            with self.connection.cursor() as cursor:
                cursor.callproc(proc_name, params or ())
                results = cursor.fetchall()
                self.connection.commit()
                return results
        except Exception as e:
            self.connection.rollback()
            logger.error(f"存储过程调用失败: {proc_name}, 错误: {e}")
            raise
    
    def __enter__(self):
        """上下文管理器入口"""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """上下文管理器出口"""
        if exc_type:
            if self.connection:
                self.connection.rollback()
        self.close()


@contextmanager
def get_db_connection(db_config: Optional[Dict[str, Any]] = None):
    """
    获取数据库连接的上下文管理器
    
    Args:
        db_config: 数据库配置字典
        
    Yields:
        Database对象
        
    Example:
        with get_db_connection() as db:
            results = db.query("SELECT * FROM users")
    """
    db = Database(db_config)
    try:
        db.connect()
        yield db
    finally:
        db.close()


def test_connection() -> bool:
    """
    测试数据库连接
    
    Returns:
        连接是否成功
    """
    try:
        with get_db_connection() as db:
            result = db.query_one("SELECT 1 as test")
            if result and result.get('test') == 1:
                logger.info("数据库连接测试成功")
                return True
            else:
                logger.error("数据库连接测试失败：查询结果异常")
                return False
    except Exception as e:
        logger.error(f"数据库连接测试失败: {e}")
        return False


if __name__ == '__main__':
    # 配置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # 测试数据库连接
    print("=== 测试数据库连接 ===")
    if test_connection():
        print("✓ 数据库连接正常")
    else:
        print("✗ 数据库连接失败")
    
    # 测试查询
    print("\n=== 测试数据库查询 ===")
    try:
        with get_db_connection() as db:
            # 查询数据库版本
            result = db.query_one("SELECT VERSION() as version")
            print(f"MySQL版本: {result['version']}")
            
            # 查询表列表
            tables = db.query("SHOW TABLES")
            print(f"数据库表数量: {len(tables)}")
            
            print("✓ 数据库查询正常")
    except Exception as e:
        print(f"✗ 数据库查询失败: {e}")
