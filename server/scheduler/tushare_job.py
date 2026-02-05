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
import time
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import tushare as ts
from sqlalchemy import create_engine
from sqlalchemy.sql import text
from sqlalchemy.pool import QueuePool
import traceback

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/data_integration.log'),
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
                f"?charset=utf8mb4&connect_timeout=60"
            )
            self.engine = create_engine(
                db_url,
                poolclass=QueuePool,
                pool_size=5,
                max_overflow=10,
                pool_recycle=3600,
                pool_pre_ping=True,
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
            df = self.pro.stock_basic(exchange='', list_status='L')
            df = df[df['ts_code'].str.contains(r'(SZ|SH|BJ)', regex=True)]

            self.stock_list = df
            logger.info(f"获取到{len(df)}只A股股票代码")

            return df
        except Exception as e:
            logger.error(f"获取股票代码列表失败: {str(e)}")
            raise

    def save_stock_list_data(self, df: pd.DataFrame) -> Tuple[int, int, str]:
        """
        保存股票列表到数据库（批量插入/更新）
        
        Args:
            df: 股票列表DataFrame

        Returns:
            (插入记录数, 更新记录数, 错误信息)
        """
        try:
            if len(df) == 0:
                return 0, 0, "没有数据"

            logger.info(f"开始批量保存{len(df)}只股票列表到数据库...")

            df_clean = df.replace({np.nan: None, np.inf: None, -np.inf: None})
            
            columns = ['ts_code', 'symbol', 'name', 'area', 'industry', 'cnspell', 
                      'market', 'list_date', 'act_name', 'act_ent_type']
            
            values_list = []
            for _, row in df_clean.iterrows():
                values = tuple(row.get(col) for col in columns)
                values_list.append(values)

            batch_size = 1000
            total_affected = 0

            raw_conn = self.engine.raw_connection()
            try:
                cursor = raw_conn.cursor()
                try:
                    for i in range(0, len(values_list), batch_size):
                        batch = values_list[i:i + batch_size]
                        batch_with_is_active = [row + (1,) for row in batch]
                        placeholders = ','.join(['(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)'] * len(batch))
                        flat_values = [v for row in batch_with_is_active for v in row]
                        
                        sql = f"""
                            INSERT INTO stock_list 
                            (ts_code, symbol, name, area, industry, cnspell, market, list_date, act_name, act_ent_type, is_active)
                            VALUES {placeholders}
                            ON DUPLICATE KEY UPDATE
                            symbol=VALUES(symbol), name=VALUES(name), area=VALUES(area), 
                            industry=VALUES(industry), cnspell=VALUES(cnspell), market=VALUES(market),
                            list_date=VALUES(list_date), act_name=VALUES(act_name), 
                            act_ent_type=VALUES(act_ent_type), is_active=1
                        """
                        
                        cursor.execute(sql, flat_values)
                        total_affected += cursor.rowcount
                        logger.info(f"批次{i//batch_size + 1}: 处理{len(batch)}条")

                    raw_conn.commit()
                    logger.info(f"股票列表保存完成: 共影响{total_affected}行")
                    return total_affected, 0, ""

                except Exception as e:
                    raw_conn.rollback()
                    logger.error(f"批量保存失败: {str(e)}")
                    raise
                finally:
                    cursor.close()
            finally:
                raw_conn.close()

        except Exception as e:
            error_msg = f"保存股票列表失败: {str(e)}"
            logger.error(error_msg)
            return 0, 0, error_msg

    def get_new_stocks(self) -> List[str]:
        """
        获取新上市股票列表（数据库中不存在或is_active=0的股票）

        Returns:
            新股票代码列表
        """
        try:
            current_stocks = self.get_stock_list()
            current_codes = set(current_stocks['ts_code'].tolist())

            with self.engine.connect() as conn:
                sql = text("SELECT ts_code FROM stock_list WHERE is_active = 1")
                result = conn.execute(sql)
                db_codes = set([row[0] for row in result])

            new_codes = list(current_codes - db_codes)
            logger.info(f"检测到{len(new_codes)}只新股票")

            return new_codes

        except Exception as e:
            logger.error(f"获取新股票列表失败: {str(e)}")
            return []

    def is_first_run(self) -> bool:
        """
        检测是否首次运行（数据库中stk_factor_pro_data表是否为空）

        Returns:
            是否首次运行
        """
        try:
            with self.engine.connect() as conn:
                sql = text("SELECT COUNT(*) as cnt FROM stk_factor_pro_data LIMIT 1")
                result = conn.execute(sql).fetchone()
                return result[0] == 0
        except Exception as e:
            logger.error(f"检测首次运行失败: {str(e)}")
            return True

    def get_trade_cal(self, start_date: str, end_date: str) -> List[str]:
        """
        获取交易日历

        Args:
            start_date: 开始日期(YYYYMMDD)
            end_date: 结束日期(YYYYMMDD)

        Returns:
            交易日期列表
        """
        try:
            df = self.pro.trade_cal(exchange='SSE', start_date=start_date, end_date=end_date, is_open='1')
            trade_dates = df['cal_date'].tolist()
            logger.info(f"获取到{len(trade_dates)}个交易日")
            return trade_dates
        except Exception as e:
            logger.error(f"获取交易日历失败: {str(e)}")
            return []

    def fetch_historical_stk_factor(self, ts_codes: List[str], trade_dates: List[str]) -> pd.DataFrame:
        """
        获取多个交易日的技术因子数据（考虑1万条上限）

        Args:
            ts_codes: 股票代码列表
            trade_dates: 交易日期列表

        Returns:
            技术因子数据DataFrame
        """
        try:
            all_data = []
            total_records = len(ts_codes) * len(trade_dates)
            
            logger.info(f"预计获取{total_records}条数据（{len(ts_codes)}只股票 × {len(trade_dates)}个交易日）")
            
            if total_records > 100000:
                logger.info("数据量超过10万条，将按交易日分批获取")
                for trade_date in trade_dates:
                    logger.info(f"获取{trade_date}的技术因子数据...")
                    df = self.fetch_stk_factor_pro_data(trade_date, ts_codes)
                    if not df.empty:
                        all_data.append(df)
                    time.sleep(0.5)
            else:
                for trade_date in trade_dates:
                    logger.info(f"获取{trade_date}的技术因子数据...")
                    df = self.fetch_stk_factor_pro_data(trade_date, ts_codes)
                    if not df.empty:
                        all_data.append(df)
                    time.sleep(0.5)

            if all_data:
                result_df = pd.concat(all_data, ignore_index=True)
                logger.info(f"共获取{len(result_df)}条历史技术因子数据")
                return result_df
            else:
                return pd.DataFrame()

        except Exception as e:
            logger.error(f"获取历史技术因子数据失败: {str(e)}")
            return pd.DataFrame()

    def smart_sync_stk_factor(self, trade_date: str, lookback_days: int = 20) -> Tuple[int, int, str]:
        """
        智能同步技术因子数据（增量+存量，控制1万条上限）

        Args:
            trade_date: 当前交易日期
            lookback_days: 回溯天数

        Returns:
            (插入记录数, 更新记录数, 错误信息)
        """
        try:
            logger.info(f"开始智能同步技术因子数据，当前交易日: {trade_date}")

            stock_list_df = self.get_stock_list()
            all_ts_codes = stock_list_df['ts_code'].tolist()
            logger.info(f"当前A股股票数量: {len(all_ts_codes)}")

            total_inserted = 0
            total_updated = 0

            if self.is_first_run():
                logger.info("检测到首次运行，执行全量同步...")
                end_date = datetime.strptime(trade_date, '%Y%m%d')
                start_date = end_date - timedelta(days=lookback_days * 3)
                all_trade_dates = self.get_trade_cal(start_date.strftime('%Y%m%d'), trade_date)
                
                all_trade_dates.sort()
                
                if len(all_trade_dates) >= lookback_days:
                    trade_dates = all_trade_dates[-lookback_days:]
                else:
                    trade_dates = all_trade_dates

                logger.info(f"获取最近{len(trade_dates)}个交易日数据: {trade_dates[0]} 至 {trade_dates[-1]}")
                total_records = len(all_ts_codes) * len(trade_dates)
                logger.info(f"预计同步{total_records}条数据（{len(all_ts_codes)}只股票 × {len(trade_dates)}个交易日）")
                
                for td in trade_dates:
                    df = self.fetch_stk_factor_pro_data(td, all_ts_codes)
                    if not df.empty:
                        inserted, updated, error = self.save_stk_factor_pro_data(df, td)
                        total_inserted += inserted
                        total_updated += updated
                    time.sleep(0.5)

                logger.info(f"全量同步完成: 插入{total_inserted}条，更新{total_updated}条")
            else:
                new_stocks = self.get_new_stocks()

                if new_stocks:
                    logger.info(f"为{len(new_stocks)}只新股票回溯{lookback_days}个交易日数据...")
                    end_date = datetime.strptime(trade_date, '%Y%m%d')
                    start_date = end_date - timedelta(days=lookback_days * 3)
                    all_trade_dates = self.get_trade_cal(start_date.strftime('%Y%m%d'), trade_date)
                    
                    all_trade_dates.sort()
                    
                    if len(all_trade_dates) >= lookback_days:
                        trade_dates = all_trade_dates[-lookback_days:]
                    else:
                        trade_dates = all_trade_dates

                    for td in trade_dates:
                        df = self.fetch_stk_factor_pro_data(td, new_stocks)
                        if not df.empty:
                            inserted, updated, error = self.save_stk_factor_pro_data(df, td)
                            total_inserted += inserted
                            total_updated += updated
                        time.sleep(0.5)

                logger.info(f"同步当天数据...")
                df = self.fetch_stk_factor_pro_data(trade_date, all_ts_codes)
                if not df.empty:
                    inserted, updated, error = self.save_stk_factor_pro_data(df, trade_date)
                    total_inserted += inserted
                    total_updated += updated

            return total_inserted, total_updated, ""

        except Exception as e:
            error_msg = f"智能同步技术因子数据失败: {str(e)}"
            logger.error(error_msg)
            return 0, 0, error_msg

    def fetch_bak_daily_data(self, trade_date: str, ts_codes: List[str] = None) -> pd.DataFrame:
        """
        获取备用行情数据

        Args:
            trade_date: 交易日期(YYYYMMDD格式)
            ts_codes: 股票代码列表（从stock_list获取）

        Returns:
            备用行情数据DataFrame
        """
        try:
            logger.info(f"开始获取{trade_date}的备用行情数据...")

            df = self.pro.bak_daily(trade_date=trade_date)

            if df is None or len(df) == 0:
                logger.warning(f"{trade_date}没有获取到备用行情数据")
                return pd.DataFrame()

            if ts_codes:
                df = df[df['ts_code'].isin(ts_codes)]
            
            df = self._convert_data_types(df, 'bak_daily')

            logger.info(f"成功获取{trade_date}的备用行情数据，共{len(df)}条记录")
            return df

        except Exception as e:
            logger.error(f"获取备用行情数据失败: {str(e)}")
            raise

    def fetch_stk_factor_pro_data(self, trade_date: str, ts_codes: List[str] = None) -> pd.DataFrame:
        """
        获取技术面因子数据（分批处理，单次上限1万条）

        Args:
            trade_date: 交易日期(YYYYMMDD格式)
            ts_codes: 股票代码列表（从stock_list获取）

        Returns:
            技术面因子数据DataFrame
        """
        try:
            logger.info(f"开始获取{trade_date}的技术面因子数据...")

            if ts_codes and len(ts_codes) > 10000:
                logger.warning(f"股票代码数量{len(ts_codes)}超过1万条上限，将分批获取")
                all_data = []
                batch_size = 9000
                
                for i in range(0, len(ts_codes), batch_size):
                    batch_codes = ts_codes[i:i + batch_size]
                    logger.info(f"获取第{i//batch_size + 1}批数据，代码数量: {len(batch_codes)}")
                    
                    df_batch = self.pro.stk_factor_pro(trade_date=trade_date, ts_code=','.join(batch_codes))
                    
                    if df_batch is not None and len(df_batch) > 0:
                        all_data.append(df_batch)
                    
                    time.sleep(0.5)
                
                if all_data:
                    df = pd.concat(all_data, ignore_index=True)
                else:
                    return pd.DataFrame()
            else:
                df = self.pro.stk_factor_pro(trade_date=trade_date)
                
                if df is None or len(df) == 0:
                    logger.warning(f"{trade_date}没有获取到技术面因子数据")
                    return pd.DataFrame()
                
                if ts_codes:
                    df = df[df['ts_code'].isin(ts_codes)]
            
            df = self._convert_data_types(df, 'stk_factor_pro')

            logger.info(f"成功获取{trade_date}的技术面因子数据，共{len(df)}条记录")
            return df

        except Exception as e:
            logger.error(f"获取技术面因子数据失败: {str(e)}")
            raise

    def _clean_nan_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        彻底清理DataFrame中的NaN/NA值，替换为None（适配MySQL的NULL）

        Args:
            df: 原始DataFrame

        Returns:
            清理后的DataFrame
        """
        try:
            # 1. 替换numpy的nan、inf、-inf为None
            df = df.replace({
                np.nan: None,
                np.inf: None,
                -np.inf: None
            })

            # 2. 处理pandas的NA值
            df = df.where(pd.notna(df), None)

            # 3. 遍历检查所有值，确保没有遗漏的NaN
            for col in df.columns:
                df[col] = df[col].apply(lambda x: None if (isinstance(x, float) and np.isnan(x)) else x)

            return df
        except Exception as e:
            logger.error(f"清理NaN值失败: {str(e)}")
            raise

    def _convert_data_types(self, df: pd.DataFrame, data_type: str) -> pd.DataFrame:
        """
        转换数据类型并清理NaN值

        Args:
            df: 原始DataFrame
            data_type: 数据类型(bak_daily或stk_factor_pro)

        Returns:
            转换后的DataFrame
        """
        try:
            if df.empty:
                return df

            # 先清理NaN值
            df = self._clean_nan_values(df)

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
                        # 转换为数值类型，错误值转为None
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                        # 再次清理转换后产生的NaN
                        df[col] = df[col].apply(lambda x: None if pd.isna(x) else x)

                # 整数字段转换（使用Nullable Integer类型）
                int_cols = ['vol', 'selling', 'buying']
                for col in int_cols:
                    if col in df.columns:
                        # 先转换为数值，再转为Nullable int
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                        df[col] = df[col].astype('Int64', errors='ignore')
                        # NaN转为None
                        df[col] = df[col].apply(lambda x: None if pd.isna(x) else x)

            elif data_type == 'stk_factor_pro':
                # 获取所有数值列
                numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns.tolist()

                # 排除ts_code和trade_date
                exclude_cols = ['ts_code', 'trade_date']
                numeric_cols = [col for col in numeric_cols if col not in exclude_cols]

                # 转换数值类型
                for col in numeric_cols:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                    df[col] = df[col].apply(lambda x: None if pd.isna(x) else x)

                # 整数字段
                int_cols = ['updays', 'downdays', 'vol']
                for col in int_cols:
                    if col in df.columns:
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                        df[col] = df[col].astype('Int64', errors='ignore')
                        df[col] = df[col].apply(lambda x: None if pd.isna(x) else x)

            return df

        except Exception as e:
            logger.error(f"数据类型转换失败: {str(e)}")
            raise

    def _escape_mysql_keywords(self, column_name: str) -> str:
        """
        转义MySQL保留关键字字段名

        Args:
            column_name: 原始字段名

        Returns:
            转义后的字段名（用反引号包裹）
        """
        # MySQL常见保留关键字列表（重点处理当前遇到的）
        reserved_keywords = {'change', 'open', 'close', 'high', 'low', 'desc', 'order', 'limit'}

        if column_name.lower() in reserved_keywords:
            return f"`{column_name}`"
        return column_name

    def save_bak_daily_data(self, df: pd.DataFrame, trade_date: str) -> Tuple[int, int, str]:
        """
        保存备用行情数据到数据库（批量插入/更新）

        Args:
            df: 数据DataFrame
            trade_date: 交易日期

        Returns:
            (插入记录数, 更新记录数, 错误信息)
        """
        try:
            if len(df) == 0:
                return 0, 0, "没有数据"

            logger.info(f"开始批量保存{trade_date}的备用行情数据，共{len(df)}条...")

            df_clean = df.replace({np.nan: None, np.inf: None, -np.inf: None})
            
            columns = ['ts_code', 'trade_date', 'name', 'pct_change', 'close', 'change',
                      'open', 'high', 'low', 'pre_close', 'vol_ratio', 'turn_over',
                      'swing', 'vol', 'amount', 'selling', 'buying', 'total_share', 
                      'float_share', 'pe', 'industry', 'area', 'float_mv', 'total_mv', 
                      'avg_price', 'strength', 'activity', 'avg_turnover', 'attack', 
                      'interval_3', 'interval_6']
            
            values_list = []
            for _, row in df_clean.iterrows():
                values = tuple(row.get(col) for col in columns)
                values_list.append(values)

            batch_size = 500
            total_affected = 0

            raw_conn = self.engine.raw_connection()
            try:
                cursor = raw_conn.cursor()
                try:
                    for i in range(0, len(values_list), batch_size):
                        batch = values_list[i:i + batch_size]
                        placeholders = ','.join(['(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)'] * len(batch))
                        flat_values = [v for row in batch for v in row]
                        
                        sql = f"""
                            INSERT INTO bak_daily_data 
                            (ts_code, trade_date, name, pct_change, `close`, `change`,
                            `open`, `high`, `low`, pre_close, vol_ratio, turn_over,
                            swing, vol, amount, selling, buying, total_share, float_share, pe,
                            industry, area, float_mv, total_mv, avg_price, strength, activity,
                            avg_turnover, attack, interval_3, interval_6)
                            VALUES {placeholders}
                            ON DUPLICATE KEY UPDATE
                            name=VALUES(name), pct_change=VALUES(pct_change), `close`=VALUES(`close`),
                            `change`=VALUES(`change`), `open`=VALUES(`open`), `high`=VALUES(`high`),
                            `low`=VALUES(`low`), pre_close=VALUES(pre_close), vol_ratio=VALUES(vol_ratio),
                            turn_over=VALUES(turn_over), swing=VALUES(swing), vol=VALUES(vol),
                            amount=VALUES(amount), selling=VALUES(selling), buying=VALUES(buying),
                            total_share=VALUES(total_share), float_share=VALUES(float_share), pe=VALUES(pe),
                            industry=VALUES(industry), area=VALUES(area), float_mv=VALUES(float_mv),
                            total_mv=VALUES(total_mv), avg_price=VALUES(avg_price), strength=VALUES(strength),
                            activity=VALUES(activity), avg_turnover=VALUES(avg_turnover), attack=VALUES(attack),
                            interval_3=VALUES(interval_3), interval_6=VALUES(interval_6)
                        """
                        
                        cursor.execute(sql, flat_values)
                        total_affected += cursor.rowcount
                        logger.info(f"批次{i//batch_size + 1}: 处理{len(batch)}条")

                    raw_conn.commit()
                    logger.info(f"备用行情数据保存完成: 共影响{total_affected}行")
                    return total_affected, 0, ""

                except Exception as e:
                    raw_conn.rollback()
                    logger.error(f"批量保存失败: {str(e)}")
                    raise
                finally:
                    cursor.close()
            finally:
                raw_conn.close()

        except Exception as e:
            error_msg = f"保存备用行情数据失败: {str(e)}"
            logger.error(error_msg)
            return 0, 0, error_msg

    def save_stk_factor_pro_data(self, df: pd.DataFrame, trade_date: str) -> Tuple[int, int, str]:
        """
        保存技术面因子数据到数据库（批量插入/更新）

        Args:
            df: 数据DataFrame
            trade_date: 交易日期

        Returns:
            (插入记录数, 更新记录数, 错误信息)
        """
        try:
            if len(df) == 0:
                return 0, 0, "没有数据"

            logger.info(f"开始批量保存{trade_date}的技术面因子数据，共{len(df)}条...")

            df_clean = df.replace({np.nan: None, np.inf: None, -np.inf: None})
            
            columns = [col for col in df_clean.columns]
            escaped_columns = [self._escape_mysql_keywords(col) for col in columns]
            
            values_list = []
            for _, row in df_clean.iterrows():
                values = tuple(row.get(col) for col in columns)
                values_list.append(values)

            batch_size = 500
            total_affected = 0
            num_fields = len(columns)

            raw_conn = self.engine.raw_connection()
            try:
                cursor = raw_conn.cursor()
                try:
                    for i in range(0, len(values_list), batch_size):
                        batch = values_list[i:i + batch_size]
                        placeholder = '(' + ','.join(['%s'] * num_fields) + ')'
                        placeholders = ','.join([placeholder] * len(batch))
                        flat_values = [v for row in batch for v in row]
                        
                        update_clauses = []
                        for escaped_col, col in zip(escaped_columns, columns):
                            if col not in ['ts_code', 'trade_date']:
                                update_clauses.append(f"{escaped_col}=VALUES({escaped_col})")
                        update_clause_str = ', '.join(update_clauses)
                        
                        sql = f"""
                            INSERT INTO stk_factor_pro_data 
                            ({', '.join(escaped_columns)})
                            VALUES {placeholders}
                            ON DUPLICATE KEY UPDATE {update_clause_str}
                        """
                        
                        cursor.execute(sql, flat_values)
                        total_affected += cursor.rowcount
                        logger.info(f"批次{i//batch_size + 1}: 处理{len(batch)}条")

                    raw_conn.commit()
                    logger.info(f"技术面因子数据保存完成: 共影响{total_affected}行")
                    return total_affected, 0, ""

                except Exception as e:
                    raw_conn.rollback()
                    logger.error(f"批量保存失败: {str(e)}")
                    raise
                finally:
                    cursor.close()
            finally:
                raw_conn.close()

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
        集成单个交易日的所有数据（增量+存量智能同步）

        Args:
            trade_date: 交易日期(YYYYMMDD格式)

        Returns:
            集成结果字典
        """
        result = {
            'trade_date': trade_date,
            'stock_list': {'status': 'failed', 'inserted': 0, 'updated': 0, 'error': ''},
            'bak_daily': {'status': 'failed', 'inserted': 0, 'updated': 0, 'error': ''},
            'stk_factor_pro': {'status': 'failed', 'inserted': 0, 'updated': 0, 'error': ''}
        }

        try:
            # 1. 同步股票列表
            start_time = datetime.now()
            try:
                stock_list_df = self.get_stock_list(force_refresh=True)
                inserted, updated, error = self.save_stock_list_data(stock_list_df)
                duration = int((datetime.now() - start_time).total_seconds())

                status = 'success' if (inserted + updated) > 0 else 'failed'
                if error and (inserted + updated) > 0:
                    status = 'partial'

                result['stock_list'] = {
                    'status': status,
                    'inserted': inserted,
                    'updated': updated,
                    'error': error,
                    'total': len(stock_list_df)
                }
                self.log_integration_result(trade_date, 'stock_list', status,
                                            len(stock_list_df), inserted, updated, error, duration)
            except Exception as e:
                error_msg = f"股票列表同步失败: {str(e)}"
                result['stock_list']['error'] = error_msg
                self.log_integration_result(trade_date, 'stock_list', 'failed', 0, 0, 0, error_msg)

            # 2. 同步备用行情数据
            start_time = datetime.now()
            try:
                ts_codes = stock_list_df['ts_code'].tolist() if not stock_list_df.empty else None
                bak_daily_df = self.fetch_bak_daily_data(trade_date, ts_codes)
                inserted, updated, error = self.save_bak_daily_data(bak_daily_df, trade_date)
                duration = int((datetime.now() - start_time).total_seconds())

                status = 'success' if (inserted + updated) > 0 else 'failed'
                if error and (inserted + updated) > 0:
                    status = 'partial'

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

            # 3. 智能同步技术面因子数据
            start_time = datetime.now()
            try:
                inserted, updated, error = self.smart_sync_stk_factor(trade_date)
                duration = int((datetime.now() - start_time).total_seconds())

                status = 'success' if (inserted + updated) > 0 else 'failed'
                if error and (inserted + updated) > 0:
                    status = 'partial'

                result['stk_factor_pro'] = {
                    'status': status,
                    'inserted': inserted,
                    'updated': updated,
                    'error': error,
                    'total': inserted + updated
                }
                self.log_integration_result(trade_date, 'stk_factor_pro', status,
                                            inserted + updated, inserted, updated, error, duration)
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

