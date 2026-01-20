#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tushare数据集成核心模块
用于从Tushare获取备用行情数据和技术面因子数据，并存储到MySQL数据库
"""

import os
import sys
import logging
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import tushare as ts
from sqlalchemy import create_engine, text
from sqlalchemy.pool import QueuePool
import traceback

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/home/ubuntu/logs/data_integration.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class TushareDataIntegrator:
    """Tushare数据集成器"""
    
    def __init__(self, tushare_token: str, db_config: Dict):
        """
        初始化数据集成器
        
        Args:
            tushare_token: Tushare API密钥
            db_config: 数据库配置字典，包含host、port、user、password、database
        """
        self.tushare_token = tushare_token
        self.db_config = db_config
        self.pro = None
        self.engine = None
        self.stock_list = None
        
        # 初始化Tushare API
        self._init_tushare()
        
        # 初始化数据库连接
        self._init_database()
        
    def _init_tushare(self):
        """初始化Tushare API连接"""
        try:
            ts.set_token(self.tushare_token)
            self.pro = ts.pro_api()
            logger.info("Tushare API初始化成功")
        except Exception as e:
            logger.error(f"Tushare API初始化失败: {str(e)}")
            raise
    
    def _init_database(self):
        """初始化数据库连接"""
        try:
            db_url = (
                f"mysql+pymysql://{self.db_config['user']}:{self.db_config['password']}"
                f"@{self.db_config['host']}:{self.db_config['port']}/{self.db_config['database']}"
            )
            self.engine = create_engine(
                db_url,
                poolclass=QueuePool,
                pool_size=5,
                max_overflow=10,
                pool_recycle=3600,
                echo=False
            )
            # 测试连接
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("数据库连接成功")
        except Exception as e:
            logger.error(f"数据库连接失败: {str(e)}")
            raise
    
    def get_stock_list(self, force_refresh: bool = False) -> pd.DataFrame:
        """
        获取A股股票代码列表
        
        Args:
            force_refresh: 是否强制刷新
            
        Returns:
            股票列表DataFrame
        """
        try:
            if self.stock_list is not None and not force_refresh:
                return self.stock_list
            
            logger.info("获取A股股票代码列表...")
            # 获取所有股票代码
            df = self.pro.stock_basic(exchange='', list_status='L')
            
            # 只保留A股（沪深京）
            df = df[df['ts_code'].str.contains(r'(SZ|SH|BJ)', regex=True)]
            
            self.stock_list = df
            logger.info(f"获取到{len(df)}只A股股票代码")
            
            return df
        except Exception as e:
            logger.error(f"获取股票代码列表失败: {str(e)}")
            raise
    
    def fetch_bak_daily_data(self, trade_date: str) -> pd.DataFrame:
        """
        获取备用行情数据
        
        Args:
            trade_date: 交易日期(YYYYMMDD格式)
            
        Returns:
            备用行情数据DataFrame
        """
        try:
            logger.info(f"开始获取{trade_date}的备用行情数据...")
            
            # 获取所有字段
            fields = (
                'ts_code,trade_date,name,pct_change,close,price_change,open_price,'
                'high_price,low_price,pre_close,vol_ratio,turn_over,swing,vol,amount,'
                'selling,buying,total_share,float_share,pe,industry,area,float_mv,'
                'total_mv,avg_price,strength,activity,avg_turnover,attack,interval_3,interval_6'
            )
            
            # 使用trade_date参数获取数据
            df = self.pro.bak_daily(trade_date=trade_date)
            
            if df is None or len(df) == 0:
                logger.warning(f"{trade_date}没有获取到备用行情数据")
                return pd.DataFrame()
            
            # 数据类型转换
            df = self._convert_data_types(df, 'bak_daily')
            
            logger.info(f"成功获取{trade_date}的备用行情数据，共{len(df)}条记录")
            return df
            
        except Exception as e:
            logger.error(f"获取备用行情数据失败: {str(e)}")
            raise
    
    def fetch_stk_factor_pro_data(self, trade_date: str) -> pd.DataFrame:
        """
        获取技术面因子数据
        
        Args:
            trade_date: 交易日期(YYYYMMDD格式)
            
        Returns:
            技术面因子数据DataFrame
        """
        try:
            logger.info(f"开始获取{trade_date}的技术面因子数据...")
            
            # 获取技术面因子数据
            df = self.pro.stk_factor_pro(trade_date=trade_date)
            
            if df is None or len(df) == 0:
                logger.warning(f"{trade_date}没有获取到技术面因子数据")
                return pd.DataFrame()
            
            # 数据类型转换
            df = self._convert_data_types(df, 'stk_factor_pro')
            
            logger.info(f"成功获取{trade_date}的技术面因子数据，共{len(df)}条记录")
            return df
            
        except Exception as e:
            logger.error(f"获取技术面因子数据失败: {str(e)}")
            raise
    
    def _convert_data_types(self, df: pd.DataFrame, data_type: str) -> pd.DataFrame:
        """
        转换数据类型
        
        Args:
            df: 原始DataFrame
            data_type: 数据类型(bak_daily或stk_factor_pro)
            
        Returns:
            转换后的DataFrame
        """
        try:
            # 处理NaN值
            df = df.replace({np.nan: None})
            
            if data_type == 'bak_daily':
                # 数值字段转换
                numeric_cols = [
                    'pct_change', 'close', 'price_change', 'open_price', 'high_price', 'low_price',
                    'pre_close', 'vol_ratio', 'turn_over', 'swing', 'vol', 'amount',
                    'selling', 'buying', 'total_share', 'float_share', 'pe', 'float_mv',
                    'total_mv', 'avg_price', 'strength', 'activity', 'avg_turnover', 'attack',
                    'interval_3', 'interval_6'
                ]
                for col in numeric_cols:
                    if col in df.columns:
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                
                # 整数字段转换
                int_cols = ['vol', 'selling', 'buying']
                for col in int_cols:
                    if col in df.columns:
                        df[col] = df[col].astype('Int64', errors='ignore')
            
            elif data_type == 'stk_factor_pro':
                # 获取所有数值列
                numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns.tolist()
                
                # 排除ts_code和trade_date
                exclude_cols = ['ts_code', 'trade_date']
                numeric_cols = [col for col in numeric_cols if col not in exclude_cols]
                
                # 转换数值类型
                for col in numeric_cols:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                
                # 整数字段
                int_cols = ['updays', 'downdays', 'vol']
                for col in int_cols:
                    if col in df.columns:
                        df[col] = df[col].astype('Int64', errors='ignore')
            
            return df
            
        except Exception as e:
            logger.error(f"数据类型转换失败: {str(e)}")
            raise
    
    def save_bak_daily_data(self, df: pd.DataFrame, trade_date: str) -> Tuple[int, int, str]:
        """
        保存备用行情数据到数据库
        
        Args:
            df: 数据DataFrame
            trade_date: 交易日期
            
        Returns:
            (插入记录数, 更新记录数, 错误信息)
        """
        try:
            if len(df) == 0:
                return 0, 0, "没有数据"
            
            logger.info(f"开始保存{trade_date}的备用行情数据到数据库...")
            
            inserted = 0
            updated = 0
            
            with self.engine.connect() as conn:
                for idx, row in df.iterrows():
                    try:
                        # 检查记录是否存在
                        check_sql = text(
                            "SELECT id FROM bak_daily_data WHERE ts_code = :ts_code AND trade_date = :trade_date"
                        )
                        result = conn.execute(check_sql, {
                            'ts_code': row['ts_code'],
                            'trade_date': row['trade_date']
                        }).fetchone()
                        
                        if result:
                            # 更新记录
                            update_sql = text("""
                                UPDATE bak_daily_data SET
                                name = :name, pct_change = :pct_change, close_price = :close_price,
                                price_change = :price_change, open_price = :open_price,
                                high_price = :high_price, low_price = :low_price, pre_close = :pre_close,
                                vol_ratio = :vol_ratio, turn_over = :turn_over, swing = :swing,
                                vol = :vol, amount = :amount, selling = :selling, buying = :buying,
                                total_share = :total_share, float_share = :float_share, pe = :pe,
                                industry = :industry, area = :area, float_mv = :float_mv,
                                total_mv = :total_mv, avg_price = :avg_price, strength = :strength,
                                activity = :activity, avg_turnover = :avg_turnover, attack = :attack,
                                interval_3 = :interval_3, interval_6 = :interval_6
                                WHERE ts_code = :ts_code AND trade_date = :trade_date
                            """)
                            conn.execute(update_sql, {
                                'ts_code': row['ts_code'],
                                'trade_date': row['trade_date'],
                                'name': row.get('name'),
                                'pct_change': row.get('pct_change'),
                                'close_price': row.get('close'),
                                'price_change': row.get('price_change'),
                                'open_price': row.get('open_price'),
                                'high_price': row.get('high_price'),
                                'low_price': row.get('low_price'),
                                'pre_close': row.get('pre_close'),
                                'vol_ratio': row.get('vol_ratio'),
                                'turn_over': row.get('turn_over'),
                                'swing': row.get('swing'),
                                'vol': row.get('vol'),
                                'amount': row.get('amount'),
                                'selling': row.get('selling'),
                                'buying': row.get('buying'),
                                'total_share': row.get('total_share'),
                                'float_share': row.get('float_share'),
                                'pe': row.get('pe'),
                                'industry': row.get('industry'),
                                'area': row.get('area'),
                                'float_mv': row.get('float_mv'),
                                'total_mv': row.get('total_mv'),
                                'avg_price': row.get('avg_price'),
                                'strength': row.get('strength'),
                                'activity': row.get('activity'),
                                'avg_turnover': row.get('avg_turnover'),
                                'attack': row.get('attack'),
                                'interval_3': row.get('interval_3'),
                                'interval_6': row.get('interval_6')
                            })
                            updated += 1
                        else:
                            # 插入新记录
                            insert_sql = text("""
                                INSERT INTO bak_daily_data (
                                    ts_code, trade_date, name, pct_change, close_price, price_change,
                                    open_price, high_price, low_price, pre_close, vol_ratio, turn_over,
                                    swing, vol, amount, selling, buying, total_share, float_share, pe,
                                    industry, area, float_mv, total_mv, avg_price, strength, activity,
                                    avg_turnover, attack, interval_3, interval_6
                                ) VALUES (
                                    :ts_code, :trade_date, :name, :pct_change, :close_price, :price_change,
                                    :open_price, :high_price, :low_price, :pre_close, :vol_ratio, :turn_over,
                                    :swing, :vol, :amount, :selling, :buying, :total_share, :float_share, :pe,
                                    :industry, :area, :float_mv, :total_mv, :avg_price, :strength, :activity,
                                    :avg_turnover, :attack, :interval_3, :interval_6
                                )
                            """)
                            conn.execute(insert_sql, {
                                'ts_code': row['ts_code'],
                                'trade_date': row['trade_date'],
                                'name': row.get('name'),
                                'pct_change': row.get('pct_change'),
                                'close_price': row.get('close'),
                                'price_change': row.get('price_change'),
                                'open_price': row.get('open_price'),
                                'high_price': row.get('high_price'),
                                'low_price': row.get('low_price'),
                                'pre_close': row.get('pre_close'),
                                'vol_ratio': row.get('vol_ratio'),
                                'turn_over': row.get('turn_over'),
                                'swing': row.get('swing'),
                                'vol': row.get('vol'),
                                'amount': row.get('amount'),
                                'selling': row.get('selling'),
                                'buying': row.get('buying'),
                                'total_share': row.get('total_share'),
                                'float_share': row.get('float_share'),
                                'pe': row.get('pe'),
                                'industry': row.get('industry'),
                                'area': row.get('area'),
                                'float_mv': row.get('float_mv'),
                                'total_mv': row.get('total_mv'),
                                'avg_price': row.get('avg_price'),
                                'strength': row.get('strength'),
                                'activity': row.get('activity'),
                                'avg_turnover': row.get('avg_turnover'),
                                'attack': row.get('attack'),
                                'interval_3': row.get('interval_3'),
                                'interval_6': row.get('interval_6')
                            })
                            inserted += 1
                    
                    except Exception as e:
                        logger.error(f"保存行{idx}数据失败: {str(e)}")
                        continue
                
                conn.commit()
            
            logger.info(f"备用行情数据保存完成: 插入{inserted}条，更新{updated}条")
            return inserted, updated, ""
            
        except Exception as e:
            error_msg = f"保存备用行情数据失败: {str(e)}"
            logger.error(error_msg)
            return 0, 0, error_msg
    
    def save_stk_factor_pro_data(self, df: pd.DataFrame, trade_date: str) -> Tuple[int, int, str]:
        """
        保存技术面因子数据到数据库
        
        Args:
            df: 数据DataFrame
            trade_date: 交易日期
            
        Returns:
            (插入记录数, 更新记录数, 错误信息)
        """
        try:
            if len(df) == 0:
                return 0, 0, "没有数据"
            
            logger.info(f"开始保存{trade_date}的技术面因子数据到数据库...")
            
            inserted = 0
            updated = 0
            
            with self.engine.connect() as conn:
                for idx, row in df.iterrows():
                    try:
                        # 检查记录是否存在
                        check_sql = text(
                            "SELECT id FROM stk_factor_pro_data WHERE ts_code = :ts_code AND trade_date = :trade_date"
                        )
                        result = conn.execute(check_sql, {
                            'ts_code': row['ts_code'],
                            'trade_date': row['trade_date']
                        }).fetchone()
                        
                        # 构建字段映射
                        field_mapping = {}
                        for col in df.columns:
                            if col not in ['ts_code', 'trade_date']:
                                field_mapping[col] = row.get(col)
                        
                        if result:
                            # 更新记录
                            set_clause = ', '.join([f"{col} = :{col}" for col in field_mapping.keys()])
                            update_sql = text(f"""
                                UPDATE stk_factor_pro_data SET {set_clause}
                                WHERE ts_code = :ts_code AND trade_date = :trade_date
                            """)
                            params = {
                                'ts_code': row['ts_code'],
                                'trade_date': row['trade_date'],
                                **field_mapping
                            }
                            conn.execute(update_sql, params)
                            updated += 1
                        else:
                            # 插入新记录
                            cols = ['ts_code', 'trade_date'] + list(field_mapping.keys())
                            cols_str = ', '.join(cols)
                            placeholders = ', '.join([f":{col}" for col in cols])
                            insert_sql = text(f"""
                                INSERT INTO stk_factor_pro_data ({cols_str})
                                VALUES ({placeholders})
                            """)
                            params = {
                                'ts_code': row['ts_code'],
                                'trade_date': row['trade_date'],
                                **field_mapping
                            }
                            conn.execute(insert_sql, params)
                            inserted += 1
                    
                    except Exception as e:
                        logger.error(f"保存行{idx}数据失败: {str(e)}")
                        continue
                
                conn.commit()
            
            logger.info(f"技术面因子数据保存完成: 插入{inserted}条，更新{updated}条")
            return inserted, updated, ""
            
        except Exception as e:
            error_msg = f"保存技术面因子数据失败: {str(e)}"
            logger.error(error_msg)
            return 0, 0, error_msg
    
    def log_integration_result(self, trade_date: str, data_type: str, status: str,
                              total_records: int, inserted: int, updated: int,
                              error_message: str = "", duration_seconds: int = 0):
        """
        记录数据集成结果
        
        Args:
            trade_date: 交易日期
            data_type: 数据类型
            status: 状态(success/failed/partial)
            total_records: 总记录数
            inserted: 插入记录数
            updated: 更新记录数
            error_message: 错误信息
            duration_seconds: 耗时(秒)
        """
        try:
            with self.engine.connect() as conn:
                insert_sql = text("""
                    INSERT INTO data_integration_log (
                        trade_date, data_type, status, total_records, inserted_records,
                        updated_records, error_message, end_time, duration_seconds
                    ) VALUES (
                        :trade_date, :data_type, :status, :total_records, :inserted_records,
                        :updated_records, :error_message, NOW(), :duration_seconds
                    )
                """)
                conn.execute(insert_sql, {
                    'trade_date': trade_date,
                    'data_type': data_type,
                    'status': status,
                    'total_records': total_records,
                    'inserted_records': inserted,
                    'updated_records': updated,
                    'error_message': error_message,
                    'duration_seconds': duration_seconds
                })
                conn.commit()
        except Exception as e:
            logger.error(f"记录集成结果失败: {str(e)}")
    
    def integrate_daily_data(self, trade_date: str) -> Dict:
        """
        集成单个交易日的所有数据
        
        Args:
            trade_date: 交易日期(YYYYMMDD格式)
            
        Returns:
            集成结果字典
        """
        result = {
            'trade_date': trade_date,
            'bak_daily': {'status': 'failed', 'inserted': 0, 'updated': 0, 'error': ''},
            'stk_factor_pro': {'status': 'failed', 'inserted': 0, 'updated': 0, 'error': ''}
        }
        
        try:
            # 获取并保存备用行情数据
            start_time = datetime.now()
            try:
                bak_daily_df = self.fetch_bak_daily_data(trade_date)
                inserted, updated, error = self.save_bak_daily_data(bak_daily_df, trade_date)
                duration = int((datetime.now() - start_time).total_seconds())
                
                status = 'success' if len(bak_daily_df) > 0 else 'failed'
                result['bak_daily'] = {
                    'status': status,
                    'inserted': inserted,
                    'updated': updated,
                    'error': error,
                    'total': len(bak_daily_df)
                }
                self.log_integration_result(trade_date, 'bak_daily', status,
                                           len(bak_daily_df), inserted, updated, error, duration)
            except Exception as e:
                error_msg = f"备用行情数据集成失败: {str(e)}"
                result['bak_daily']['error'] = error_msg
                self.log_integration_result(trade_date, 'bak_daily', 'failed', 0, 0, 0, error_msg)
            
            # 获取并保存技术面因子数据
            start_time = datetime.now()
            try:
                stk_factor_df = self.fetch_stk_factor_pro_data(trade_date)
                inserted, updated, error = self.save_stk_factor_pro_data(stk_factor_df, trade_date)
                duration = int((datetime.now() - start_time).total_seconds())
                
                status = 'success' if len(stk_factor_df) > 0 else 'failed'
                result['stk_factor_pro'] = {
                    'status': status,
                    'inserted': inserted,
                    'updated': updated,
                    'error': error,
                    'total': len(stk_factor_df)
                }
                self.log_integration_result(trade_date, 'stk_factor_pro', status,
                                           len(stk_factor_df), inserted, updated, error, duration)
            except Exception as e:
                error_msg = f"技术面因子数据集成失败: {str(e)}"
                result['stk_factor_pro']['error'] = error_msg
                self.log_integration_result(trade_date, 'stk_factor_pro', 'failed', 0, 0, 0, error_msg)
            
            return result
            
        except Exception as e:
            logger.error(f"数据集成失败: {str(e)}\n{traceback.format_exc()}")
            raise
    
    def close(self):
        """关闭数据库连接"""
        if self.engine:
            self.engine.dispose()
            logger.info("数据库连接已关闭")


if __name__ == '__main__':
    # 示例使用
    db_config = {
        'host': 'mysql-2579b2bfcbcb-public.rds.volces.com',
        'port': 3306,
        'user': 'bestismark',
        'password': 'Aa123456',
        'database': 'ttssreport'
    }
    
    tushare_token = 'a266b71c03f7666e00c6492021a3f0e8517d7242ad446d79fb363fc9'
    
    integrator = TushareDataIntegrator(tushare_token, db_config)
    
    # 测试：集成最近一个交易日的数据
    trade_date = (datetime.now() - timedelta(days=1)).strftime('%Y%m%d')
    result = integrator.integrate_daily_data(trade_date)
    
    print("集成结果:")
    print(result)
    
    integrator.close()
