import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
import json
from utils.logger import setup_logger
from datetime import datetime, timedelta
from core.database import get_sync_connection

logger = setup_logger(__name__, 'b1_signal_service.log')


class B1SignalService:
    _stock_list_cache = None
    _cache_expire_time = None
    _cache_duration = timedelta(minutes=30)
    
    def __init__(self, db_config: Dict = None):
        self.conn = None
        
    def connect(self):
        try:
            self.conn = get_sync_connection()
            logger.debug("从连接池获取连接")
        except Exception as e:
            logger.error(f"获取数据库连接失败: {e}")
            raise
    
    def close(self):
        if self.conn:
            self.conn.close()
            logger.debug("连接已归还连接池")
    
    def save_tag_config(self, tags: List[Dict], user_id: int = None) -> Dict:
        try:
            if not tags:
                return {'success': True, 'updated_count': 0, 'enabled_count': 0}

            cursor = self.conn.cursor()

            # 精确更新：直接设置每个标签的目标值
            enabled_count = 0
            case_clauses_is_enabled = []
            case_clauses_threshold = []
            params = []

            for tag in tags:
                tag_id = tag.get('id')
                is_enabled = tag.get('is_enabled', 0)
                threshold_value = tag.get('threshold_value')

                case_clauses_is_enabled.append(f"WHEN id = %s THEN %s")
                case_clauses_threshold.append(f"WHEN id = %s THEN %s")
                params.extend([tag_id, is_enabled, tag_id, threshold_value])

                if is_enabled == 1:
                    enabled_count += 1

            # 构建精确更新的SQL
            all_ids = [tag['id'] for tag in tags]
            placeholders = ','.join(['%s'] * len(all_ids))

            case_sql_is_enabled = "CASE " + " ".join(case_clauses_is_enabled) + " END"
            case_sql_threshold = "CASE " + " ".join(case_clauses_threshold) + " END"

            if user_id:
                sql = f"""
                UPDATE strategy_config_tags 
                SET is_enabled = {case_sql_is_enabled}, 
                    threshold_value = {case_sql_threshold}
                WHERE id IN ({placeholders}) AND strategy_type = 'B1' AND user_id = %s
                """
                cursor.execute(sql, params + all_ids + [user_id])
            else:
                sql = f"""
                UPDATE strategy_config_tags 
                SET is_enabled = {case_sql_is_enabled}, 
                    threshold_value = {case_sql_threshold}
                WHERE id IN ({placeholders}) AND strategy_type = 'B1'
                """
                cursor.execute(sql, params + all_ids)

            self.conn.commit()
            cursor.close()
            logger.info(f"保存标签配置成功: {len(tags)} 个标签已更新，{enabled_count} 个已启用")
            return {'success': True, 'updated_count': len(tags), 'enabled_count': enabled_count}
        except Exception as e:
            logger.error(f"保存标签配置失败: {e}")
            self.conn.rollback()
            raise

    def save_threshold(self, tag_code: str, threshold_value: float, user_id: int = None) -> Dict:
        try:
            cursor = self.conn.cursor()
            if user_id:
                cursor.execute(
                    "UPDATE strategy_config_tags SET threshold_value = %s WHERE tag_code = %s AND strategy_type = 'B1' AND user_id = %s",
                    [threshold_value, tag_code, user_id]
                )
            else:
                cursor.execute(
                    "UPDATE strategy_config_tags SET threshold_value = %s WHERE tag_code = %s AND strategy_type = 'B1'",
                    [threshold_value, tag_code]
                )
            self.conn.commit()
            affected = cursor.rowcount
            cursor.close()
            logger.info(f"保存阈值成功: {tag_code} = {threshold_value}")
            return {'success': True, 'affected': affected}
        except Exception as e:
            logger.error(f"保存阈值失败: {e}")
            self.conn.rollback()
            raise

    def get_all_tags(self, user_id: int = None) -> List[Dict]:
        try:
            if user_id:
                sql = """
                SELECT id, tag_name, tag_code, category, is_enabled, is_filter, threshold_value, sort_order
                FROM strategy_config_tags
                WHERE strategy_type = 'B1' AND user_id = %s
                ORDER BY is_filter DESC, sort_order ASC
                """
                df = pd.read_sql(sql, self.conn, params=[user_id])
            else:
                sql = """
                SELECT id, tag_name, tag_code, category, is_enabled, is_filter, threshold_value, sort_order
                FROM strategy_config_tags
                WHERE strategy_type = 'B1'
                ORDER BY is_filter DESC, sort_order ASC
                """
                df = pd.read_sql(sql, self.conn)
            df = df.fillna(value=np.nan).replace({np.nan: None})
            return df.to_dict('records')
        except Exception as e:
            logger.error(f"获取所有标签失败: {e}")
            raise

    def load_tag_config(self, custom_tags: List[str] = None, user_id: int = None) -> Dict:
        try:
            if custom_tags:
                placeholders = ','.join(['%s'] * len(custom_tags))
                if user_id:
                    sql = f"""
                    SELECT id, tag_name, tag_code, category, is_enabled, is_filter, threshold_value, sort_order
                    FROM strategy_config_tags
                    WHERE strategy_type = 'B1' AND user_id = %s AND tag_code IN ({placeholders})
                    ORDER BY is_filter DESC, sort_order ASC
                    """
                    df = pd.read_sql(sql, self.conn, params=[user_id] + custom_tags)
                else:
                    sql = f"""
                    SELECT id, tag_name, tag_code, category, is_enabled, is_filter, threshold_value, sort_order
                    FROM strategy_config_tags
                    WHERE strategy_type = 'B1' AND tag_code IN ({placeholders})
                    ORDER BY is_filter DESC, sort_order ASC
                    """
                    df = pd.read_sql(sql, self.conn, params=custom_tags)
            else:
                if user_id:
                    sql = """
                    SELECT id, tag_name, tag_code, category, is_enabled, is_filter, threshold_value, sort_order
                    FROM strategy_config_tags
                    WHERE strategy_type = 'B1' AND user_id = %s AND is_enabled = 1
                    ORDER BY is_filter DESC, sort_order ASC
                    """
                    df = pd.read_sql(sql, self.conn, params=[user_id])
                else:
                    sql = """
                    SELECT id, tag_name, tag_code, category, is_enabled, is_filter, threshold_value, sort_order
                    FROM strategy_config_tags
                    WHERE strategy_type = 'B1' AND is_enabled = 1
                    ORDER BY is_filter DESC, sort_order ASC
                    """
                    df = pd.read_sql(sql, self.conn)

            results = df.to_dict('records')

            tag_config = {
                'filter_tags': [r for r in results if r['is_filter'] == 1],
                'plus_tags': [r for r in results if r['category'] == 'plus' and r['is_filter'] == 0],
                'minus_tags': [r for r in results if r['category'] == 'minus']
            }

            logger.info(f"加载标签配置: 过滤项{len(tag_config['filter_tags'])}个, "
                       f"加分项{len(tag_config['plus_tags'])}个, "
                       f"减分项{len(tag_config['minus_tags'])}个")

            return tag_config
        except Exception as e:
            logger.error(f"加载标签配置失败: {e}")
            raise
    
    @classmethod
    def _is_cache_valid(cls) -> bool:
        """检查缓存是否有效"""
        if cls._stock_list_cache is None or cls._cache_expire_time is None:
            return False
        return datetime.now() < cls._cache_expire_time
    
    @classmethod
    def _update_cache(cls, stock_codes: List[str]):
        """更新缓存"""
        cls._stock_list_cache = stock_codes
        cls._cache_expire_time = datetime.now() + cls._cache_duration
        logger.info(f"缓存已更新：{len(stock_codes)} 只股票，过期时间：{cls._cache_expire_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    @classmethod
    def clear_cache(cls):
        """清除缓存（定时任务调用）"""
        cls._stock_list_cache = None
        cls._cache_expire_time = None
        logger.info("股票列表缓存已清除")
    
    def get_active_stock_codes(self, force_refresh: bool = False) -> List[str]:
        """
        获取活跃股票代码列表（带缓存）
        
        Args:
            force_refresh: 是否强制刷新缓存
            
        Returns:
            股票代码列表
        """
        # 定时任务强制刷新，API调用使用缓存
        if not force_refresh and self._is_cache_valid():
            logger.info(f"使用缓存数据：{len(self._stock_list_cache)} 只股票（缓存过期时间：{self._cache_expire_time.strftime('%H:%M:%S')}）")
            return self._stock_list_cache
        
        # 从数据库查询
        sql_stocks = "SELECT ts_code FROM stock_list WHERE is_active = 1"
        df_stocks = pd.read_sql(sql_stocks, self.conn)
        all_codes = df_stocks['ts_code'].tolist()
        
        # 更新缓存
        self._update_cache(all_codes)
        logger.info(f"从数据库查询：{len(all_codes)} 只活跃股票")
        
        return all_codes
    
    def quick_filter_by_factor(self, trade_date: str, tag_config: Dict, force_refresh: bool = False,
                              j_threshold: float = None, macd_dif_threshold: float = None) -> List[str]:
        try:
            all_codes = self.get_active_stock_codes(force_refresh)
            
            if not all_codes:
                logger.warning("没有找到活跃股票")
                return []
            
            placeholders = ','.join(['%s'] * len(all_codes))
            sql_factors = f"""
            SELECT ts_code, kdj_qfq, macd_dif_qfq
            FROM stk_factor_pro_data
            WHERE trade_date = %s AND ts_code IN ({placeholders})
            """
            params = (trade_date, *all_codes)
            df_factors = pd.read_sql(sql_factors, self.conn, params=params)
            logger.info(f"步骤2：查询到 {len(df_factors)} 只股票的技术因子数据")
            
            if df_factors.empty:
                logger.warning(f"没有找到 {trade_date} 的技术因子数据")
                return []
            
            mask = pd.Series(True, index=df_factors.index)
            
            for tag in tag_config['filter_tags']:
                if tag['tag_code'] == 'j_lt_13_qfq':
                    threshold = j_threshold if j_threshold is not None else (tag.get('threshold_value') or 13)
                    mask &= (df_factors['kdj_qfq'] <= threshold)
                    logger.info(f"过滤条件：J值<={threshold}")
                elif tag['tag_code'] == 'macd_dif_gt_0_qfq':
                    threshold = macd_dif_threshold if macd_dif_threshold is not None else (tag.get('threshold_value') or 0)
                    mask &= (df_factors['macd_dif_qfq'] > threshold)
                    logger.info(f"过滤条件：MACD-DIF>{threshold}")
            
            filtered_df = df_factors[mask]
            ts_codes = filtered_df['ts_code'].tolist()
            
            logger.info(f"步骤3：内存过滤完成，从 {len(all_codes)} 只股票中筛选出 {len(ts_codes)} 只满足条件的股票")
            
            return ts_codes
            
        except Exception as e:
            logger.error(f"快速过滤失败: {e}")
            return []
    
    def get_stock_data(self, trade_date: str, ts_codes: List[str] = None) -> pd.DataFrame:
        """
        获取股票数据（第二阶段：获取详细数据用于打标签）
        
        Args:
            trade_date: 交易日期
            ts_codes: 指定股票代码列表（必需，来自快速过滤结果）
            
        Returns:
            股票数据DataFrame
        """
        try:
            if not ts_codes:
                logger.warning("未提供股票代码列表，返回空数据")
                return pd.DataFrame()
            
            placeholders = ','.join(['%s'] * len(ts_codes))
            sql = f"""
            SELECT 
                b.ts_code, b.name, b.trade_date,
                b.`open` as open_price, b.`high` as high_price, b.`low` as low_price, 
                b.`close` as close_price, b.pre_close,
                b.pct_change, b.`change` as price_change, b.vol, b.amount,
                b.vol_ratio, b.turn_over, b.swing,
                b.total_mv, b.float_mv, b.industry, b.area,
                f.kdj_qfq, f.kdj_k_qfq, f.kdj_d_qfq,
                f.macd_dif_qfq, f.macd_dea_qfq, f.macd_qfq
            FROM bak_daily_data b
            LEFT JOIN stk_factor_pro_data f ON b.ts_code = f.ts_code AND b.trade_date = f.trade_date
            WHERE b.trade_date = %s AND b.ts_code IN ({placeholders})
            """
            
            params = [trade_date] + ts_codes
            df = pd.read_sql(sql, self.conn, params=params)
            logger.info(f"获取到 {len(df)} 只股票的详细数据")
            return df
        except Exception as e:
            logger.error(f"获取股票数据失败: {e}")
            return pd.DataFrame()
    
    def get_historical_data(self, trade_date: str, days: int = 20, ts_codes: List[str] = None) -> Dict[str, List[Dict]]:
        """
        获取历史数据（按股票分组）
        
        Args:
            trade_date: 当前交易日期
            days: 回溯天数
            ts_codes: 指定股票代码列表（可选）
            
        Returns:
            字典 {股票代码: 历史数据列表}
        """
        try:
            base_sql = """
            SELECT 
                b.ts_code, b.trade_date,
                b.`open` as open_price, b.`high` as high_price, 
                b.`low` as low_price, b.`close` as close_price,
                b.pct_change, b.vol, b.amount
            FROM bak_daily_data b
            WHERE b.trade_date <= %s
            """
            
            if ts_codes:
                placeholders = ','.join(['%s'] * len(ts_codes))
                sql = base_sql + f" AND b.ts_code IN ({placeholders}) ORDER BY b.ts_code, b.trade_date DESC"
                params = [trade_date] + ts_codes
            else:
                sql = base_sql + " ORDER BY b.ts_code, b.trade_date DESC"
                params = [trade_date]
            
            df = pd.read_sql(sql, self.conn, params=params)
            df_grouped = df.groupby('ts_code').head(days)
            
            stock_history = {}
            for ts_code in df_grouped['ts_code'].unique():
                stock_df = df_grouped[df_grouped['ts_code'] == ts_code].sort_values('trade_date', ascending=True)
                stock_history[ts_code] = stock_df.to_dict('records')
            
            logger.info(f"获取到 {len(stock_history)} 只股票的历史数据，每只最多 {days} 天")
            return stock_history
        except Exception as e:
            logger.error(f"获取历史数据失败: {e}")
            return {}
    
    def verify_filter_tags(self, df: pd.DataFrame, tag_config: Dict, 
                           j_threshold: float = None, macd_dif_threshold: float = None) -> pd.DataFrame:
        mask = pd.Series(True, index=df.index)
        
        for tag in tag_config['filter_tags']:
            if tag['tag_code'] == 'j_lt_13_qfq':
                threshold = j_threshold if j_threshold is not None else (tag.get('threshold_value') or 13)
                mask &= (df['kdj_qfq'] <= threshold)
            elif tag['tag_code'] == 'macd_dif_gt_0_qfq':
                threshold = macd_dif_threshold if macd_dif_threshold is not None else (tag.get('threshold_value') or 0)
                mask &= (df['macd_dif_qfq'] > threshold)
        
        result_df = df[mask].copy()
        logger.info(f"验证过滤：输入 {len(df)} 只股票，验证通过 {len(result_df)} 只股票")
        return result_df
    
    def calc_minus_down1(self, history: List[Dict]) -> bool:
        """
        减分项1：最近10个交易日出现过（下跌且成交量>=前5日最大成交量）
        
        Args:
            history: 单只股票的历史数据列表（按时间升序）
            
        Returns:
            是否触发减分项
        """
        if len(history) < 10:
            return False
        
        recent_10_days = history[-10:]
        
        for idx, current_day in enumerate(recent_10_days):
            global_idx = len(history) - 10 + idx
            
            current_pct = float(current_day.get('pct_change', 0))
            current_volume = int(current_day.get('vol', 0))
            
            if current_pct >= 0:
                continue
            
            if global_idx < 5:
                continue
            
            pre_5_days = history[global_idx - 5: global_idx]
            pre_5_volumes = [int(d.get('vol', 0)) for d in pre_5_days]
            
            if not pre_5_volumes:
                continue
            
            pre_5_max_volume = max(pre_5_volumes)
            
            if current_volume >= pre_5_max_volume:
                return True
        
        return False
    
    def calc_minus_down2(self, history: List[Dict]) -> bool:
        """
        减分项2：最近20个交易日出现过涨停且涨停日成交量<=前一日成交量*50%
        
        Args:
            history: 单只股票的历史数据列表（按时间升序）
            
        Returns:
            是否触发减分项
        """
        if len(history) < 2:
            return False
        
        for idx, current_day in enumerate(history):
            if idx < 1:
                continue
            
            current_pct = float(current_day.get('pct_change', 0))
            current_volume = int(current_day.get('vol', 0))
            
            if current_pct < 9.8:
                continue
            
            prev_day_volume = int(history[idx - 1].get('vol', 0))
            
            if current_volume <= prev_day_volume * 0.5:
                return True
        
        return False
    
    def calc_up1_red_fat_green_thin(self, history: List[Dict]) -> bool:
        """
        加分项1：红肥绿瘦（最近10个交易日，所有上涨日交易量都大于相邻下跌日）
        
        Args:
            history: 单只股票的历史数据列表
            
        Returns:
            是否满足条件
        """
        if len(history) < 2:
            return False
        
        recent_10 = history[-10:] if len(history) >= 10 else history
        
        trend_data = []
        for item in recent_10:
            pct_chg = float(item.get('pct_change', 0))
            volume = float(item.get('vol', 0))
            
            trend_data.append({
                'trend': 'up' if pct_chg > 0 else 'down',
                'volume': volume
            })
        
        for i in range(len(trend_data)):
            curr = trend_data[i]
            if curr['trend'] != 'up':
                continue
            
            prev_down = None
            for j in range(i - 1, -1, -1):
                if trend_data[j]['trend'] == 'down':
                    prev_down = trend_data[j]
                    break
            
            next_down = None
            for j in range(i + 1, len(trend_data)):
                if trend_data[j]['trend'] == 'down':
                    next_down = trend_data[j]
                    break
            
            if prev_down and curr['volume'] <= prev_down['volume']:
                return False
            if next_down and curr['volume'] <= next_down['volume']:
                return False
        
        return True
    
    def calc_up2_shrink_after_divergence(self, history: List[Dict]) -> bool:
        """
        加分项2：分歧之后突然缩量（当日成交额 <= 前一日成交额 * 50%）
        
        Args:
            history: 单只股票的历史数据列表
            
        Returns:
            是否满足条件
        """
        if len(history) < 2:
            return False
        
        today_data = history[-1]
        prev_data = history[-2]
        
        today_amt = float(today_data.get('amount', 0))
        prev_amt = float(prev_data.get('amount', 0))
        
        if prev_amt > 0 and today_amt <= prev_amt * 0.5:
            return True
        
        return False
    
    def calc_up3_small_candle(self, current_pct: float) -> bool:
        """
        加分项3：小阴小阳（当天涨跌幅在 -2% 到 1.8% 之间）
        
        Args:
            current_pct: 当日涨跌幅
            
        Returns:
            是否满足条件
        """
        return -2 <= current_pct <= 1.8
    
    def calc_up4_recent_abnormal(self, history: List[Dict]) -> bool:
        """
        加分项4：近期有异动（最近10个交易日中存在涨幅≥6% 且 成交量≥前一日×1.5）
        
        Args:
            history: 单只股票的历史数据列表
            
        Returns:
            是否满足条件
        """
        if len(history) < 2:
            return False
        
        recent_10 = history[-10:] if len(history) >= 10 else history
        
        for i in range(1, len(recent_10)):
            curr_day = recent_10[i]
            prev_day = recent_10[i - 1]
            
            curr_pct = float(curr_day.get('pct_change', 0))
            curr_vol = float(curr_day.get('vol', 0))
            prev_vol = float(prev_day.get('vol', 0))
            
            if curr_pct >= 6.0 and prev_vol > 0 and curr_vol >= prev_vol * 1.5:
                return True
        
        return False
    
    def calc_up5_double_volume_red(self, history: List[Dict]) -> bool:
        """
        加分项5：近期有倍量红柱出现（最近10日存在上涨日且成交量≥前一日×1.8）
        
        Args:
            history: 单只股票的历史数据列表
            
        Returns:
            是否满足条件
        """
        if len(history) < 2:
            return False
        
        recent_10 = history[-10:] if len(history) >= 10 else history
        
        for i in range(1, len(recent_10)):
            curr_day = recent_10[i]
            prev_day = recent_10[i - 1]
            
            curr_pct = float(curr_day.get('pct_change', 0))
            if curr_pct <= 0:
                continue
            
            curr_vol = float(curr_day.get('vol', 0))
            prev_vol = float(prev_day.get('vol', 0))
            
            if prev_vol > 0 and curr_vol >= prev_vol * 1.8:
                return True
        
        return False
    
    def calc_up6_swing_appropriate(self, ts_code: str, swing: float) -> bool:
        """
        加分项6：振幅适当（600开头≤4%，000/300/688开头≤7%）
        
        Args:
            ts_code: 股票代码
            swing: 振幅
            
        Returns:
            是否满足条件
        """
        swing_float = float(swing) if swing else 0.0
        
        if ts_code.startswith('600'):
            return swing_float <= 4.0
        elif ts_code.startswith(('000', '300', '688')):
            return swing_float <= 7.0
        
        return False
    
    def calc_up7_market_cap_appropriate(self, total_mv: float) -> bool:
        """
        加分项7：市值适当（总市值≥80亿，数据库单位是万元）
        
        Args:
            total_mv: 总市值（万元）
            
        Returns:
            是否满足条件
        """
        total_mv_float = float(total_mv) if total_mv else 0.0
        return total_mv_float >= 800000
    
    def calc_vol_stable(self, history: List[Dict]) -> bool:
        """
        加分项：缩量企稳（成交量缩小且价格企稳）
        
        Args:
            history: 单只股票的历史数据列表
            
        Returns:
            是否满足条件
        """
        if len(history) < 5:
            return False
        
        recent_5 = history[-5:]
        amounts = [d.get('amount', 0) for d in recent_5]
        
        if len(amounts) < 3:
            return False
        
        recent_avg = sum(amounts[:2]) / 2
        prev_avg = sum(amounts[2:]) / (len(amounts) - 2)
        
        return recent_avg <= prev_avg * 0.8
    
    def calc_vol_bottom(self, current_amount: float, history: List[Dict]) -> bool:
        """
        加分项：底部放量（底部区域放量突破）
        
        Args:
            current_amount: 当日成交额
            history: 单只股票的历史数据列表
            
        Returns:
            是否满足条件
        """
        if len(history) < 5:
            return False
        
        recent_5 = history[-5:]
        amounts = [d.get('amount', 0) for d in recent_5]
        
        if not amounts:
            return False
        
        avg_amount = sum(amounts) / len(amounts)
        
        return current_amount >= avg_amount * 1.5
    
    def calc_vol_breakout(self, current_amount: float, current_pct: float, history: List[Dict]) -> bool:
        """
        加分项：放量突破（放量突破关键压力位）
        
        Args:
            current_amount: 当日成交额
            current_pct: 当日涨跌幅
            history: 单只股票的历史数据列表
            
        Returns:
            是否满足条件
        """
        if len(history) < 5:
            return False
        
        recent_5 = history[-5:]
        amounts = [d.get('amount', 0) for d in recent_5]
        
        if not amounts:
            return False
        
        avg_amount = sum(amounts) / len(amounts)
        
        return current_amount >= avg_amount * 2.0 and current_pct > 0
    
    def calc_high_vol(self, current_amount: float, history: List[Dict]) -> bool:
        """
        减分项：高位放量有风险
        
        Args:
            current_amount: 当日成交额
            history: 单只股票的历史数据列表
            
        Returns:
            是否触发减分项
        """
        if len(history) < 10:
            return False
        
        recent_10 = history[-10:]
        amounts = [d.get('amount', 0) for d in recent_10]
        
        if not amounts:
            return False
        
        max_amount = max(amounts)
        
        return current_amount >= max_amount * 0.8
    
    def calc_ma_bull(self, ts_code: str) -> bool:
        try:
            sql = """
            SELECT ma5, ma10, ma20, ma30
            FROM stk_factor_pro_data
            WHERE ts_code = %s
            ORDER BY trade_date DESC
            LIMIT 1
            """
            df = pd.read_sql(sql, self.conn, params=[ts_code])
            
            if df.empty:
                return False
            
            ma5 = df.iloc[0]['ma5']
            ma10 = df.iloc[0]['ma10']
            ma20 = df.iloc[0]['ma20']
            ma30 = df.iloc[0]['ma30']
            
            if pd.isna([ma5, ma10, ma20, ma30]).any():
                return False
            
            return ma5 > ma10 > ma20 > ma30
        except:
            return False
    
    def calc_break_ma(self, ts_code: str, close_price: float) -> bool:
        try:
            sql = """
            SELECT ma20
            FROM stk_factor_pro_data
            WHERE ts_code = %s
            ORDER BY trade_date DESC
            LIMIT 1
            """
            df = pd.read_sql(sql, self.conn, params=[ts_code])
            
            if df.empty or pd.isna(df.iloc[0]['ma20']):
                return False
            
            return close_price < df.iloc[0]['ma20']
        except:
            return False
    
    def calculate_tags(self, df: pd.DataFrame, stock_history: Dict[str, List[Dict]], tag_config: Dict) -> pd.DataFrame:
        """
        计算标签并生成结果（并行处理所有标签）
        
        Args:
            df: 过滤后的股票数据
            stock_history: 股票历史数据字典
            tag_config: 标签配置
            
        Returns:
            带标签的结果DataFrame
        """
        results = []
        
        for idx, row in df.iterrows():
            ts_code = row['ts_code']
            history = stock_history.get(ts_code, [])
            
            matched_tags = []
            matched_tag_ids = []
            matched_tag_names = []
            matched_tag_codes = []
            plus_count = 0
            minus_count = 0
            
            for tag in tag_config['filter_tags']:
                matched_tags.append(tag)
                matched_tag_ids.append(tag['id'])
                matched_tag_names.append(tag['tag_name'])
                matched_tag_codes.append(tag['tag_code'])
                plus_count += 1
            
            for tag in tag_config['plus_tags']:
                matched = False
                
                if tag['tag_code'] == 'up1':
                    matched = self.calc_up1_red_fat_green_thin(history)
                elif tag['tag_code'] == 'up2':
                    matched = self.calc_up2_shrink_after_divergence(history)
                elif tag['tag_code'] == 'up3':
                    matched = self.calc_up3_small_candle(row['pct_change'])
                elif tag['tag_code'] == 'up4':
                    matched = self.calc_up4_recent_abnormal(history)
                elif tag['tag_code'] == 'up5':
                    matched = self.calc_up5_double_volume_red(history)
                elif tag['tag_code'] == 'up6':
                    matched = self.calc_up6_swing_appropriate(ts_code, row['swing'])
                elif tag['tag_code'] == 'up7':
                    matched = self.calc_up7_market_cap_appropriate(row['total_mv'])
                
                if matched:
                    matched_tags.append(tag)
                    matched_tag_ids.append(tag['id'])
                    matched_tag_names.append(tag['tag_name'])
                    matched_tag_codes.append(tag['tag_code'])
                    plus_count += 1
            
            for tag in tag_config['minus_tags']:
                matched = False
                
                if tag['tag_code'] == 'high_vol':
                    matched = self.calc_high_vol(row['amount'], history)
                elif tag['tag_code'] == 'break_ma':
                    matched = self.calc_break_ma(ts_code, row['close_price'])
                elif tag['tag_code'] == 'down1':
                    matched = self.calc_minus_down1(history)
                elif tag['tag_code'] == 'down2':
                    matched = self.calc_minus_down2(history)
                
                if matched:
                    matched_tags.append(tag)
                    matched_tag_ids.append(tag['id'])
                    matched_tag_names.append(tag['tag_name'])
                    matched_tag_codes.append(tag['tag_code'])
                    minus_count += 1
            
            tag_score = plus_count - minus_count
            signal_strength = self.calc_signal_strength(tag_score, row.get('vol_ratio', 1.0))
            display_factor = self.generate_display_factor(matched_tags)
            
            results.append({
                'ts_code': row['ts_code'],
                'stock_name': row['name'],
                'trade_date': row['trade_date'],
                'signal_strength': signal_strength,
                'close_price': row['close_price'],
                'open_price': row['open_price'],
                'high_price': row['high_price'],
                'low_price': row['low_price'],
                'price_change': row['price_change'],
                'pct_change': row['pct_change'],
                'volume': row['vol'],
                'amount': row['amount'],
                'volume_ratio': row['vol_ratio'],
                'turnover_rate': row['turn_over'],
                'j_value': row['kdj_qfq'],
                'k_value': row['kdj_k_qfq'],
                'd_value': row['kdj_d_qfq'],
                'macd_dif': row['macd_dif_qfq'],
                'macd_dea': row['macd_dea_qfq'],
                'macd_value': row['macd_qfq'],
                'total_mv': row['total_mv'],
                'circ_mv': row['float_mv'],
                'industry': row['industry'],
                'area': row['area'],
                'display_factor': display_factor,
                'matched_tag_ids': matched_tag_ids,
                'matched_tag_names': matched_tag_names,
                'matched_tag_codes': matched_tag_codes,
                'plus_tags_count': plus_count,
                'minus_tags_count': minus_count,
                'tag_score': tag_score
            })
        
        return pd.DataFrame(results)
    
    def calc_signal_strength(self, tag_score: int, volume_ratio: float) -> str:
        if tag_score >= 5 and volume_ratio >= 2.0:
            return 'strong'
        elif tag_score >= 3:
            return 'medium'
        else:
            return 'weak'
    
    def generate_display_factor(self, matched_tags: List[Dict]) -> str:
        sorted_tags = sorted(matched_tags, key=lambda x: (not x['is_filter'], x['sort_order']))
        tag_names = [tag['tag_name'] for tag in sorted_tags[:8]]
        return ', '.join(tag_names)
    
    def save_results(self, result_df: pd.DataFrame) -> int:
        if result_df.empty:
            logger.warning("没有结果需要保存")
            return 0
        
        try:
            cursor = self.conn.cursor()
            try:
                trade_date = result_df.iloc[0]['trade_date']
                cursor.execute("DELETE FROM b1_signal_results WHERE trade_date = %s", [trade_date])
                logger.info(f"删除旧数据：{cursor.rowcount} 条")
                
                data = [
                    (row['ts_code'], row['stock_name'], row['trade_date'], row['signal_strength'],
                     row['close_price'], row['open_price'], row['high_price'], row['low_price'],
                     row['price_change'], row['pct_change'], row['volume'], row['amount'],
                     row['volume_ratio'], row['turnover_rate'], row['j_value'], row['k_value'], row['d_value'],
                     row['macd_dif'], row['macd_dea'], row['macd_value'], row['total_mv'], row['circ_mv'],
                     row['industry'], row['area'], row['display_factor'],
                     json.dumps(row['matched_tag_ids']), json.dumps(row['matched_tag_names'], ensure_ascii=False),
                     json.dumps(row['matched_tag_codes'], ensure_ascii=False),
                     row['plus_tags_count'], row['minus_tags_count'], row['tag_score'])
                    for _, row in result_df.iterrows()
                ]
                
                placeholders = "(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())"
                batch_size = 1000
                total = 0
                
                for i in range(0, len(data), batch_size):
                    batch = data[i:i+batch_size]
                    sql = f"""INSERT INTO b1_signal_results (ts_code,stock_name,trade_date,signal_strength,
                             close_price,open_price,high_price,low_price,price_change,pct_change,volume,amount,
                             volume_ratio,turnover_rate,j_value,k_value,d_value,macd_dif,macd_dea,macd_value,
                             total_mv,circ_mv,industry,area,display_factor,matched_tag_ids,matched_tag_names,matched_tag_codes,
                             plus_tags_count,minus_tags_count,tag_score,trigger_time) VALUES {','.join([placeholders]*len(batch))}"""
                    flat_data = [item for row in batch for item in row]
                    cursor.execute(sql, flat_data)
                    total += cursor.rowcount
                
                self.conn.commit()
                logger.info(f"成功保存 {total} 条B1信号结果")
                return total
            finally:
                cursor.close()
                
        except Exception as e:
            logger.error(f"保存B1信号结果失败: {e}")
            self.conn.rollback()
            return 0
    
    def filter_and_tag(
        self,
        trade_date: str,
        custom_tags: List[str] = None,
        ts_codes: List[str] = None,
        save_to_db: bool = True,
        force_refresh_cache: bool = False,
        j_threshold: float = None,
        macd_dif_threshold: float = None,
        user_id: int = None
    ) -> Dict:
        logger.info(f"开始B1信号过滤和打标签，交易日期: {trade_date}，J阈值: {j_threshold}，MACD阈值: {macd_dif_threshold}")

        tag_config = self.load_tag_config(custom_tags, user_id)
        
        if ts_codes is None:
            logger.info("第一阶段：使用技术因子快速过滤股票...")
            ts_codes = self.quick_filter_by_factor(trade_date, tag_config, force_refresh_cache, j_threshold, macd_dif_threshold)
            
            if not ts_codes:
                logger.warning(f"第一阶段过滤后没有股票满足条件")
                return {
                    'success': False,
                    'message': '没有股票满足过滤条件',
                    'data': []
                }
        else:
            logger.info(f"跳过第一阶段过滤，使用指定的 {len(ts_codes)} 只股票")
        
        logger.info(f"第二阶段：获取 {len(ts_codes)} 只股票的详细数据...")
        stock_df = self.get_stock_data(trade_date, ts_codes)
        if stock_df.empty:
            logger.warning(f"没有找到 {trade_date} 的股票数据")
            return {
                'success': False,
                'message': '没有找到股票数据',
                'data': []
            }
        
        verified_df = self.verify_filter_tags(stock_df, tag_config, j_threshold, macd_dif_threshold)
        if verified_df.empty:
            logger.warning(f"验证过滤后没有股票满足条件")
            return {
                'success': False,
                'message': '验证过滤后没有股票满足条件',
                'data': []
            }
        
        logger.info(f"第三阶段：对 {len(verified_df)} 只股票进行详细标签计算...")
        stock_history = self.get_historical_data(trade_date, days=20, ts_codes=verified_df['ts_code'].tolist())
        
        result_df = self.calculate_tags(verified_df, stock_history, tag_config)
        
        saved_count = 0
        if save_to_db:
            saved_count = self.save_results(result_df)
        
        logger.info(f"B1信号处理完成，共 {len(result_df)} 条记录，已保存 {saved_count} 条")
        
        return {
            'success': True,
            'message': f'成功处理 {len(result_df)} 条记录',
            'total': len(result_df),
            'saved': saved_count,
            'filtered_codes': ts_codes if custom_tags is None else None,
            'data': result_df.to_dict('records')
        }

    def get_stock_detail(self, ts_code: str) -> Dict:
        """
        获取股票详情数据（K线和指标）

        Args:
            ts_code: 股票代码，如 000547.SZ

        Returns:
            包含K线数据和指标数据的字典
        """
        try:
            sql = """
            SELECT
                ts_code, trade_date,
                `open` as open_price, `high` as high_price, `low` as low_price, `close` as close_price,
                pct_chg, vol,
                ma_qfq_5, ma_qfq_10,
                kdj_k_qfq, kdj_d_qfq, kdj_qfq
            FROM stk_factor_pro_data
            WHERE ts_code = %s
            ORDER BY trade_date ASC
            """
            df = pd.read_sql(sql, self.conn, params=[ts_code])

            if df.empty:
                return {
                    'success': False,
                    'message': f'未找到股票 {ts_code} 的数据',
                    'data': None
                }

            kline = []
            indicators = []

            for _, row in df.iterrows():
                trade_date = row['trade_date']
                if trade_date and len(trade_date) == 8:
                    time = f"{trade_date[:4]}-{trade_date[4:6]}-{trade_date[6:8]}"
                else:
                    time = trade_date
                kline.append({
                    'time': time,
                    'open': float(row['open_price']) if row['open_price'] else None,
                    'high': float(row['high_price']) if row['high_price'] else None,
                    'low': float(row['low_price']) if row['low_price'] else None,
                    'close': float(row['close_price']) if row['close_price'] else None,
                    'pct_chg': float(row['pct_chg']) if row['pct_chg'] else None,
                    'volume': int(row['vol']) if row['vol'] else None
                })

                indicators.append({
                    'time': time,
                    'ma5': float(row['ma_qfq_5']) if pd.notna(row['ma_qfq_5']) else None,
                    'ma10': float(row['ma_qfq_10']) if pd.notna(row['ma_qfq_10']) else None,
                    'volume': int(row['vol']) if row['vol'] else None,
                    'k': float(row['kdj_k_qfq']) if pd.notna(row['kdj_k_qfq']) else None,
                    'd': float(row['kdj_d_qfq']) if pd.notna(row['kdj_d_qfq']) else None,
                    'j': float(row['kdj_qfq']) if pd.notna(row['kdj_qfq']) else None
                })

            logger.info(f"获取股票 {ts_code} 详情数据，共 {len(kline)} 条记录")

            return {
                'success': True,
                'data': {
                    'ts_code': ts_code,
                    'kline': kline,
                    'indicators': indicators
                }
            }

        except Exception as e:
            logger.error(f"获取股票 {ts_code} 详情数据失败: {e}")
            return {
                'success': False,
                'message': str(e),
                'data': None
            }
