"""
股票标签计算引擎
用于计算P0核心标签（6个简单标签）
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import pymysql
from pymysql.cursors import DictCursor
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TagCalculationEngine:
    """标签计算引擎"""
    
    def __init__(self, db_config: Dict):
        """
        初始化标签计算引擎
        
        Args:
            db_config: 数据库配置
        """
        self.db_config = db_config
        self.conn = None
        
    def connect(self):
        """连接数据库"""
        try:
            self.conn = pymysql.connect(
                host=self.db_config['host'],
                port=self.db_config['port'],
                user=self.db_config['user'],
                password=self.db_config['password'],
                database=self.db_config['database'],
                charset='utf8mb4',
                cursorclass=DictCursor
            )
            logger.info("数据库连接成功")
        except Exception as e:
            logger.error(f"数据库连接失败: {e}")
            raise
    
    def close(self):
        """关闭数据库连接"""
        if self.conn:
            self.conn.close()
            logger.info("数据库连接已关闭")
    
    def get_latest_trade_date(self) -> Optional[str]:
        """获取最新交易日期"""
        try:
            with self.conn.cursor() as cursor:
                sql = "SELECT MAX(trade_date) as latest_date FROM bak_daily_data"
                cursor.execute(sql)
                result = cursor.fetchone()
                return result['latest_date'].strftime('%Y%m%d') if result['latest_date'] else None
        except Exception as e:
            logger.error(f"获取最新交易日期失败: {e}")
            return None
    
    def get_stock_data(self, trade_date: str) -> pd.DataFrame:
        """
        获取指定交易日的股票数据
        
        Args:
            trade_date: 交易日期（格式：YYYYMMDD）
            
        Returns:
            股票数据DataFrame
        """
        try:
            sql = """
            SELECT 
                b.ts_code,
                b.name,
                b.trade_date,
                b.open,
                b.high,
                b.low,
                b.close,
                b.pre_close,
                b.pct_chg,
                b.vol,
                b.amount,
                b.amplitude,
                b.total_mv,
                f.kdj_j,
                f.macd_dif
            FROM bak_daily_data b
            LEFT JOIN stk_factor_pro_data f ON b.ts_code = f.ts_code AND b.trade_date = f.trade_date
            WHERE b.trade_date = %s
            """
            df = pd.read_sql(sql, self.conn, params=[trade_date])
            logger.info(f"获取到 {len(df)} 只股票的数据")
            return df
        except Exception as e:
            logger.error(f"获取股票数据失败: {e}")
            return pd.DataFrame()
    
    def get_previous_trade_data(self, trade_date: str) -> pd.DataFrame:
        """
        获取前一交易日的数据（用于计算需要历史数据的标签）
        
        Args:
            trade_date: 当前交易日期（格式：YYYYMMDD）
            
        Returns:
            前一交易日数据DataFrame
        """
        try:
            sql = """
            SELECT 
                ts_code,
                trade_date,
                amount
            FROM bak_daily_data
            WHERE trade_date = (
                SELECT MAX(trade_date) 
                FROM bak_daily_data 
                WHERE trade_date < %s
            )
            """
            df = pd.read_sql(sql, self.conn, params=[trade_date])
            logger.info(f"获取到 {len(df)} 只股票的前一交易日数据")
            return df
        except Exception as e:
            logger.error(f"获取前一交易日数据失败: {e}")
            return pd.DataFrame()
    
    # ==================== P0标签计算函数 ====================
    
    def calc_tag_b1_j_value(self, df: pd.DataFrame) -> pd.Series:
        """
        计算标签：B1 (J值≤13)
        
        Args:
            df: 股票数据DataFrame
            
        Returns:
            布尔值Series
        """
        return df['kdj_j'] <= 13
    
    def calc_tag_macd_positive(self, df: pd.DataFrame) -> pd.Series:
        """
        计算标签：MACD＞0 (MACD_DIF > 0.5)
        
        Args:
            df: 股票数据DataFrame
            
        Returns:
            布尔值Series
        """
        return df['macd_dif'] > 0.5
    
    def calc_tag_divergence_to_consensus(self, df: pd.DataFrame, prev_df: pd.DataFrame) -> pd.Series:
        """
        计算标签：分歧后一致 (当日成交额≤前一交易日成交额*50%)
        
        Args:
            df: 当前交易日数据
            prev_df: 前一交易日数据
            
        Returns:
            布尔值Series
        """
        # 合并当前和前一交易日的数据
        merged = df.merge(
            prev_df[['ts_code', 'amount']],
            on='ts_code',
            how='left',
            suffixes=('', '_prev')
        )
        
        # 计算条件
        result = merged['amount'] <= (merged['amount_prev'] * 0.5)
        
        # 填充NaN为False
        return result.fillna(False)
    
    def calc_tag_small_candle(self, df: pd.DataFrame) -> pd.Series:
        """
        计算标签：小阴小阳 (+1.8%≥当日涨跌幅≥-2%)
        
        Args:
            df: 股票数据DataFrame
            
        Returns:
            布尔值Series
        """
        return (df['pct_chg'] >= -2.0) & (df['pct_chg'] <= 1.8)
    
    def calc_tag_amplitude_appropriate(self, df: pd.DataFrame) -> pd.Series:
        """
        计算标签：振幅适当
        - 600开头的股票：当日振幅≤4%
        - 000、300、688开头的股票：当日振幅≤7%
        
        Args:
            df: 股票数据DataFrame
            
        Returns:
            布尔值Series
        """
        # 提取股票代码前缀
        df['code_prefix'] = df['ts_code'].str[:3]
        
        # 根据不同前缀设置不同的振幅阈值
        result = pd.Series(False, index=df.index)
        
        # 600开头：振幅≤4%
        mask_600 = df['code_prefix'] == '600'
        result[mask_600] = df.loc[mask_600, 'amplitude'] <= 4.0
        
        # 000、300、688开头：振幅≤7%
        mask_other = df['code_prefix'].isin(['000', '300', '688'])
        result[mask_other] = df.loc[mask_other, 'amplitude'] <= 7.0
        
        return result
    
    def calc_tag_market_cap_appropriate(self, df: pd.DataFrame) -> pd.Series:
        """
        计算标签：市值适当 (总市值≥80亿人民币)
        注意：数据库中total_mv单位是万元，需要转换
        
        Args:
            df: 股票数据DataFrame
            
        Returns:
            布尔值Series
        """
        # total_mv单位是万元，80亿 = 800,000万元
        return df['total_mv'] >= 800000
    
    # ==================== 标签计算主流程 ====================
    
    def calculate_all_tags(self, trade_date: str) -> pd.DataFrame:
        """
        计算所有P0标签
        
        Args:
            trade_date: 交易日期（格式：YYYYMMDD）
            
        Returns:
            标签结果DataFrame
        """
        logger.info(f"开始计算 {trade_date} 的标签...")
        
        # 获取当前交易日数据
        df = self.get_stock_data(trade_date)
        if df.empty:
            logger.warning(f"没有找到 {trade_date} 的数据")
            return pd.DataFrame()
        
        # 获取前一交易日数据（用于分歧后一致标签）
        prev_df = self.get_previous_trade_data(trade_date)
        
        # 计算各个标签
        tags = {}
        
        # 1. B1 (J值≤13)
        tags['B1'] = self.calc_tag_b1_j_value(df)
        logger.info(f"B1标签: {tags['B1'].sum()} 只股票满足")
        
        # 2. MACD＞0
        tags['MACD＞0'] = self.calc_tag_macd_positive(df)
        logger.info(f"MACD＞0标签: {tags['MACD＞0'].sum()} 只股票满足")
        
        # 3. 分歧后一致
        tags['分歧后一致'] = self.calc_tag_divergence_to_consensus(df, prev_df)
        logger.info(f"分歧后一致标签: {tags['分歧后一致'].sum()} 只股票满足")
        
        # 4. 小阴小阳
        tags['小阴小阳'] = self.calc_tag_small_candle(df)
        logger.info(f"小阴小阳标签: {tags['小阴小阳'].sum()} 只股票满足")
        
        # 5. 振幅适当
        tags['振幅适当'] = self.calc_tag_amplitude_appropriate(df)
        logger.info(f"振幅适当标签: {tags['振幅适当'].sum()} 只股票满足")
        
        # 6. 市值适当
        tags['市值适当'] = self.calc_tag_market_cap_appropriate(df)
        logger.info(f"市值适当标签: {tags['市值适当'].sum()} 只股票满足")
        
        # 构建结果DataFrame
        result_rows = []
        for tag_name, tag_values in tags.items():
            for idx, (ts_code, tag_value) in enumerate(zip(df['ts_code'], tag_values)):
                result_rows.append({
                    'ts_code': ts_code,
                    'stock_name': df.iloc[idx]['name'],
                    'trade_date': trade_date,
                    'tag_name': tag_name,
                    'tag_value': bool(tag_value),
                    'strategy_type': 'B1',
                    'category': 'plus'
                })
        
        result_df = pd.DataFrame(result_rows)
        logger.info(f"标签计算完成，共 {len(result_df)} 条记录")
        
        return result_df
    
    def save_tag_results(self, result_df: pd.DataFrame) -> int:
        """
        保存标签结果到数据库
        
        Args:
            result_df: 标签结果DataFrame
            
        Returns:
            保存的记录数
        """
        if result_df.empty:
            logger.warning("没有标签结果需要保存")
            return 0
        
        try:
            # 获取标签ID映射
            tag_id_map = self.get_tag_id_map()
            
            # 添加tag_id列
            result_df['tag_id'] = result_df['tag_name'].map(tag_id_map)
            
            # 过滤掉没有匹配到tag_id的记录
            result_df = result_df[result_df['tag_id'].notna()]
            
            if result_df.empty:
                logger.warning("没有有效的标签结果需要保存")
                return 0
            
            # 准备插入数据
            insert_sql = """
            INSERT INTO stock_tag_results 
            (ts_code, stock_name, trade_date, tag_id, tag_name, tag_value, strategy_type, category)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
            tag_value = VALUES(tag_value),
            updated_at = CURRENT_TIMESTAMP
            """
            
            # 批量插入
            with self.conn.cursor() as cursor:
                data = [
                    (
                        row['ts_code'],
                        row['stock_name'],
                        row['trade_date'],
                        int(row['tag_id']),
                        row['tag_name'],
                        row['tag_value'],
                        row['strategy_type'],
                        row['category']
                    )
                    for _, row in result_df.iterrows()
                ]
                
                cursor.executemany(insert_sql, data)
                self.conn.commit()
                
                affected_rows = cursor.rowcount
                logger.info(f"成功保存 {affected_rows} 条标签结果")
                
                return affected_rows
                
        except Exception as e:
            logger.error(f"保存标签结果失败: {e}")
            self.conn.rollback()
            return 0
    
    def get_tag_id_map(self) -> Dict[str, int]:
        """获取标签名称到ID的映射"""
        try:
            with self.conn.cursor() as cursor:
                sql = "SELECT id, name FROM strategy_config_tags WHERE strategy_type = 'B1'"
                cursor.execute(sql)
                results = cursor.fetchall()
                
                tag_map = {row['name']: row['id'] for row in results}
                logger.info(f"获取到 {len(tag_map)} 个标签映射")
                
                return tag_map
        except Exception as e:
            logger.error(f"获取标签映射失败: {e}")
            return {}
    
    def update_tag_summary(self, trade_date: str) -> int:
        """
        更新标签汇总表
        
        Args:
            trade_date: 交易日期（格式：YYYYMMDD）
            
        Returns:
            更新的记录数
        """
        try:
            with self.conn.cursor() as cursor:
                # 删除旧的汇总数据
                delete_sql = """
                DELETE FROM stock_tag_summary 
                WHERE trade_date = %s AND strategy_type = 'B1'
                """
                cursor.execute(delete_sql, [trade_date])
                
                # 插入新的汇总数据
                insert_sql = """
                INSERT INTO stock_tag_summary 
                (ts_code, stock_name, trade_date, strategy_type, total_tags, matched_tags, 
                 plus_tags, minus_tags, tag_score, matched_tag_ids, matched_tag_names,
                 current_price, price_change, pct_change, volume, amount, total_mv)
                SELECT 
                    r.ts_code,
                    r.stock_name,
                    r.trade_date,
                    r.strategy_type,
                    COUNT(*) as total_tags,
                    SUM(CASE WHEN r.tag_value = TRUE THEN 1 ELSE 0 END) as matched_tags,
                    SUM(CASE WHEN r.tag_value = TRUE AND r.category = 'plus' THEN 1 ELSE 0 END) as plus_tags,
                    SUM(CASE WHEN r.tag_value = TRUE AND r.category = 'minus' THEN 1 ELSE 0 END) as minus_tags,
                    SUM(CASE WHEN r.tag_value = TRUE AND r.category = 'plus' THEN 1 
                             WHEN r.tag_value = TRUE AND r.category = 'minus' THEN -1 
                             ELSE 0 END) as tag_score,
                    JSON_ARRAYAGG(CASE WHEN r.tag_value = TRUE THEN r.tag_id ELSE NULL END) as matched_tag_ids,
                    JSON_ARRAYAGG(CASE WHEN r.tag_value = TRUE THEN r.tag_name ELSE NULL END) as matched_tag_names,
                    b.close as current_price,
                    b.close - b.pre_close as price_change,
                    b.pct_chg as pct_change,
                    b.vol as volume,
                    b.amount as amount,
                    b.total_mv as total_mv
                FROM stock_tag_results r
                LEFT JOIN bak_daily_data b ON r.ts_code = b.ts_code AND r.trade_date = b.trade_date
                WHERE r.trade_date = %s AND r.strategy_type = 'B1'
                GROUP BY r.ts_code, r.stock_name, r.trade_date, r.strategy_type,
                         b.close, b.pre_close, b.pct_chg, b.vol, b.amount, b.total_mv
                """
                cursor.execute(insert_sql, [trade_date])
                self.conn.commit()
                
                affected_rows = cursor.rowcount
                logger.info(f"成功更新 {affected_rows} 条汇总记录")
                
                return affected_rows
                
        except Exception as e:
            logger.error(f"更新标签汇总失败: {e}")
            self.conn.rollback()
            return 0
    
    def cleanup_old_data(self, days_to_keep: int = 90) -> Dict[str, int]:
        """
        清理超过指定天数的旧数据
        
        Args:
            days_to_keep: 保留的天数
            
        Returns:
            清理结果统计
        """
        try:
            with self.conn.cursor() as cursor:
                cursor.callproc('sp_cleanup_old_tag_data', [days_to_keep])
                result = cursor.fetchone()
                self.conn.commit()
                
                logger.info(f"数据清理完成: {result}")
                return result
                
        except Exception as e:
            logger.error(f"清理旧数据失败: {e}")
            return {}


def main():
    """主函数：测试标签计算引擎"""
    
    # 数据库配置
    db_config = {
        'host': 'mysql-2579b2bfcbcb-public.rds.volces.com',
        'port': 3306,
        'user': 'bestismark',
        'password': 'Aa123456',
        'database': 'ttssreport'
    }
    
    # 创建引擎实例
    engine = TagCalculationEngine(db_config)
    
    try:
        # 连接数据库
        engine.connect()
        
        # 获取最新交易日期
        trade_date = engine.get_latest_trade_date()
        if not trade_date:
            logger.error("无法获取最新交易日期")
            return
        
        logger.info(f"最新交易日期: {trade_date}")
        
        # 计算标签
        result_df = engine.calculate_all_tags(trade_date)
        
        # 保存结果
        if not result_df.empty:
            saved_count = engine.save_tag_results(result_df)
            logger.info(f"保存了 {saved_count} 条标签结果")
            
            # 更新汇总表
            summary_count = engine.update_tag_summary(trade_date)
            logger.info(f"更新了 {summary_count} 条汇总记录")
        
        logger.info("标签计算完成！")
        
    except Exception as e:
        logger.error(f"标签计算失败: {e}")
        raise
    finally:
        # 关闭连接
        engine.close()


if __name__ == '__main__':
    main()
