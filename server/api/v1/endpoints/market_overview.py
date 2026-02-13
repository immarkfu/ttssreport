from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, Any
from sqlalchemy import text
from core.database import get_db
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/overview")
async def get_market_overview(db=Depends(get_db)):
    """
    获取市场概览数据（基于真实tushare数据）

    返回：
    - activeMarketCap: 当日活跃市值
    - marketSentiment: 市场情绪
    - sentimentChange: 情绪变化
    - todayB1Count: 今日B1触发数量
    - monitorPoolCount: 监控池总数
    - b1Condition: B1触发条件
    - b1Triggered: B1触发数量
    - b1Total: B1总数
    - s1Triggered: S1触发数量
    - s1Total: S1总数
    - sellWarningCount: 卖出预警数量
    - sellCondition: 卖出条件
    - yesterdayWinRate: 昨日胜率
    - winRateCondition: 胜率条件
    """
    try:
        async with db.cursor() as cursor:
            # 获取最近一个交易日的数据
            query = """
            SELECT trade_date FROM bak_daily_data
            ORDER BY trade_date DESC LIMIT 1
            """
            await cursor.execute(query)
            result = await cursor.fetchone()

            if not result:
                # 如果没有数据，返回默认值
                return {
                    "activeMarketCap": "0",
                    "marketSentiment": "无数据",
                    "sentimentChange": 0,
                    "todayB1Count": 0,
                    "monitorPoolCount": 0,
                    "b1Condition": "J值<13 & MACD>0",
                    "b1Triggered": 0,
                    "b1Total": 0,
                    "s1Triggered": 0,
                    "s1Total": 0,
                    "sellWarningCount": 0,
                    "sellCondition": "跌破白线/长放飞",
                    "yesterdayWinRate": 0,
                    "winRateCondition": "次日涨幅 > 1%"
                }

            latest_trade_date = result[0]

            # 计算活跃市值（指南针算法：用当日成交金额）
            query = """
            SELECT
                COUNT(*) as total_stocks,
                SUM(amount) as total_amount,
                AVG(pct_change) as avg_pct_change,
                SUM(CASE WHEN pct_change > 0 THEN 1 ELSE 0 END) as up_stocks,
                SUM(CASE WHEN pct_change < 0 THEN 1 ELSE 0 END) as down_stocks
            FROM bak_daily_data
            WHERE trade_date = %s
            """
            await cursor.execute(query, (latest_trade_date,))
            market_stats = await cursor.fetchone()

            if not market_stats:
                raise HTTPException(status_code=404, detail="市场统计数据不存在")

            total_stocks, total_amount, avg_pct_change, up_stocks, down_stocks = market_stats

            # 活跃市值（单位：万亿）
            if total_amount:
                active_market_cap = total_amount / 1000000000000  # 转换为万亿
                active_market_cap_str = f"{active_market_cap:.2f}万亿"
            else:
                active_market_cap_str = "0"

            # 市场情绪（基于涨跌股票比例）
            if total_stocks > 0:
                up_ratio = up_stocks / total_stocks
                if up_ratio > 0.6:
                    market_sentiment = "乐观"
                elif up_ratio > 0.4:
                    market_sentiment = "中性"
                else:
                    market_sentiment = "悲观"
            else:
                market_sentiment = "无数据"

            # 情绪变化（基于平均涨跌幅）
            sentiment_change = round(avg_pct_change, 2) if avg_pct_change else 0

            # 获取B1和S1信号统计（从b1_signals表）
            query = """
            SELECT
                COUNT(CASE WHEN signal_type = 'B1' AND DATE(created_at) = CURDATE() THEN 1 END) as today_b1_count,
                COUNT(CASE WHEN signal_type = 'B1' THEN 1 END) as total_b1_count,
                COUNT(CASE WHEN signal_type = 'S1' AND DATE(created_at) = CURDATE() THEN 1 END) as today_s1_count,
                COUNT(CASE WHEN signal_type = 'S1' THEN 1 END) as total_s1_count
            FROM b1_signals
            WHERE DATE(created_at) = CURDATE()
            """
            await cursor.execute(query)
            signal_stats = await cursor.fetchone()

            if signal_stats:
                today_b1_count, total_b1_count, today_s1_count, total_s1_count = signal_stats
            else:
                today_b1_count = total_b1_count = today_s1_count = total_s1_count = 0

            # 监控池总数（从stock_list）
            query = """
            SELECT COUNT(*) FROM stock_list WHERE is_active = 1
            """
            await cursor.execute(query)
            monitor_pool_result = await cursor.fetchone()
            monitor_pool_count = monitor_pool_result[0] if monitor_pool_result else 0

            # 昨日胜率（从历史信号计算）
-            query = """
            SELECT
                COUNT(CASE WHEN pct_change > 1 THEN 1 END) as win_count,
                COUNT(*) as total_count
            FROM bak_daily_data
            WHERE trade_date = (
                SELECT trade_date FROM bak_daily_data
                ORDER BY trade_date DESC LIMIT 1 OFFSET 1
            )
            """
            await cursor.execute(query)
            winrate_stats = await cursor.fetchone()

            if winrate_stats and winrate_stats[1] > 0:
                win_count, total_count = winrate_stats
                yesterday_win_rate = round((win_count / total_count) * 100, 1)
            else:
                yesterday_win_rate = 0

            return {
                "activeMarketCap": active_market_cap_str,
                "marketSentiment": market_sentiment,
                "sentimentChange": sentiment_change,
                "todayB1Count": today_b1_count,
                "monitorPoolCount": monitor_pool_count,
                "b1Condition": "J值<13 & MACD>0",
                "b1Triggered": today_b1_count,
                "b1Total": total_b1_count,
                "s1Triggered": today_s1_count,
                "s1Total": total_s1_count,
                "sellWarningCount": today_s1_count,
                "sellCondition": "跌破白线/长放飞",
                "yesterdayWinRate": yesterday_win_rate,
                "winRateCondition": "次日涨幅 > 1%"
            }

    except Exception as e:
        logger.error(f"获取市场概览数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/signal-distribution")
async def get_signal_distribution(db=Depends(get_db)):
    """
    获取信号强度分布

    返回：
    - strong: 强信号数量
    - medium: 中信号数量
    - pool: 观察池数量
    """
    try:
        async with db.cursor() as cursor:
            # 获取今日信号分布
            query = """
            SELECT
                COUNT(CASE WHEN signal_strength = 'strong' THEN 1 END) as strong,
                COUNT(CASE WHEN signal_strength = 'medium' THEN 1 END) as medium,
                COUNT(CASE WHEN signal_strength = 'weak' THEN 1 END) as weak
            FROM b1_signals
            WHERE signal_type = 'B1' AND DATE(created_at) = CURDATE()
            """
            await cursor.execute(query)
            result = await cursor.fetchone()

            if result:
                strong, medium, weak = result
            else:
                strong = medium = weak = 0

            # 观察池数量（监控池 - 强信号 - 中信号）
            query = """
            SELECT COUNT(*) FROM stock_list WHERE is_active = 1
            """
            await cursor.execute(query)
            monitor_pool_result = await cursor.fetchone()
            monitor_pool_count = monitor_pool_result[0] if monitor_pool_result else 0

            pool_count = monitor_pool_count - strong - medium

            return {
                "strong": strong,
                "medium": medium,
                "pool": max(pool_count, 0)
            }

    except Exception as e:
        logger.error(f"获取信号分布数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
