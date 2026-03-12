"""
市场概览 API
基于 bak_daily_data（备用行情）和 b1_signal_results（B1信号）提供仪表盘数据
"""
from fastapi import APIRouter, HTTPException, Depends
from core.database import get_db
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/overview")
async def get_market_overview(db=Depends(get_db)):
    """
    获取市场概览仪表盘数据：
    - 活跃市值、市场情绪、涨跌家数
    - 最新交易日 B1 信号触发数量
    - 监控股票总数
    - 昨日 B1 信号胜率（次日涨幅 > 1%）
    """
    try:
        async with db.cursor() as cursor:
            # ── 最新交易日 ──
            await cursor.execute(
                "SELECT MAX(trade_date) FROM bak_daily_data"
            )
            row = await cursor.fetchone()
            if not row or not row[0]:
                return _empty_overview()

            latest_date = row[0]

            # ── 当日市场统计 ──
            await cursor.execute(
                """
                SELECT
                    COUNT(*)                                           AS total_stocks,
                    COALESCE(SUM(amount), 0)                          AS total_amount,
                    COALESCE(AVG(pct_change), 0)                      AS avg_pct_change,
                    SUM(CASE WHEN pct_change > 0 THEN 1 ELSE 0 END)   AS up_stocks,
                    SUM(CASE WHEN pct_change < 0 THEN 1 ELSE 0 END)   AS down_stocks,
                    SUM(CASE WHEN pct_change = 0 THEN 1 ELSE 0 END)   AS flat_stocks
                FROM bak_daily_data
                WHERE trade_date = %s
                """,
                (latest_date,)
            )
            stats = await cursor.fetchone()
            total_stocks, total_amount, avg_pct, up_stocks, down_stocks, flat_stocks = stats

            # 活跃市值（万亿）
            active_market_cap_str = (
                f"{total_amount / 1_000_000_000_000:.2f}万亿"
                if total_amount else "0"
            )

            # 市场情绪
            up_ratio = (up_stocks / total_stocks) if total_stocks > 0 else 0
            if up_ratio > 0.6:
                market_sentiment = "乐观"
            elif up_ratio > 0.4:
                market_sentiment = "中性"
            else:
                market_sentiment = "悲观"

            sentiment_change = round(float(avg_pct), 2) if avg_pct else 0

            # ── B1 信号统计（最新交易日） ──
            await cursor.execute(
                """
                SELECT COUNT(*) FROM b1_signal_results
                WHERE trade_date = %s
                """,
                (latest_date,)
            )
            b1_today = (await cursor.fetchone())[0] or 0

            # ── B1 信号历史总数 ──
            await cursor.execute("SELECT COUNT(*) FROM b1_signal_results")
            b1_total = (await cursor.fetchone())[0] or 0

            # ── 监控股票总数 ──
            await cursor.execute("SELECT COUNT(*) FROM stock_list WHERE is_active = 1")
            monitor_pool_count = (await cursor.fetchone())[0] or 0

            # ── 昨日 B1 信号胜率（次日涨幅 > 1%） ──
            await cursor.execute(
                """
                SELECT trade_date FROM b1_signal_results
                ORDER BY trade_date DESC
                LIMIT 1 OFFSET 1
                """
            )
            prev_row = await cursor.fetchone()
            yesterday_win_rate = 0.0

            if prev_row:
                prev_date = prev_row[0]
                await cursor.execute(
                    """
                    SELECT
                        SUM(CASE WHEN d.pct_change > 1 THEN 1 ELSE 0 END) AS win_count,
                        COUNT(*)                                             AS total_count
                    FROM b1_signal_results b
                    INNER JOIN bak_daily_data d
                        ON d.ts_code = b.ts_code
                        AND d.trade_date = (
                            SELECT MIN(trade_date) FROM bak_daily_data
                            WHERE trade_date > %s
                        )
                    WHERE b.trade_date = %s
                    """,
                    (prev_date, prev_date)
                )
                wr = await cursor.fetchone()
                if wr and wr[1] and wr[1] > 0:
                    yesterday_win_rate = round(float(wr[0] or 0) / float(wr[1]) * 100, 1)

            # ── S1 信号（暂无独立表，使用占位值） ──
            s1_triggered = 0
            s1_total = 0

            return {
                "activeMarketCap": active_market_cap_str,
                "marketSentiment": market_sentiment,
                "sentimentChange": sentiment_change,
                "upStocks": int(up_stocks or 0),
                "downStocks": int(down_stocks or 0),
                "flatStocks": int(flat_stocks or 0),
                "totalStocks": int(total_stocks or 0),
                "latestTradeDate": str(latest_date),
                "todayB1Count": b1_today,
                "monitorPoolCount": monitor_pool_count,
                "b1Condition": "J值<13 & MACD>0",
                "b1Triggered": b1_today,
                "b1Total": b1_total,
                "s1Triggered": s1_triggered,
                "s1Total": s1_total,
                "sellWarningCount": s1_triggered,
                "sellCondition": "跌破白线/长放飞",
                "yesterdayWinRate": yesterday_win_rate,
                "winRateCondition": "次日涨幅 > 1%"
            }

    except Exception as e:
        logger.error(f"获取市场概览数据失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/signal-distribution")
async def get_signal_distribution(db=Depends(get_db)):
    """
    获取最新交易日 B1 信号强度分布（基于 tag_score）
    - strong: tag_score >= 4
    - medium: tag_score 2-3
    - weak:   tag_score <= 1
    """
    try:
        async with db.cursor() as cursor:
            await cursor.execute(
                """
                SELECT
                    SUM(CASE WHEN tag_score >= 4 THEN 1 ELSE 0 END) AS strong,
                    SUM(CASE WHEN tag_score BETWEEN 2 AND 3 THEN 1 ELSE 0 END) AS medium,
                    SUM(CASE WHEN tag_score <= 1 THEN 1 ELSE 0 END) AS weak
                FROM b1_signal_results
                WHERE trade_date = (SELECT MAX(trade_date) FROM b1_signal_results)
                """
            )
            row = await cursor.fetchone()
            strong = int(row[0] or 0)
            medium = int(row[1] or 0)
            weak = int(row[2] or 0)

            await cursor.execute("SELECT COUNT(*) FROM stock_list WHERE is_active = 1")
            monitor_pool_count = (await cursor.fetchone())[0] or 0
            pool_count = max(monitor_pool_count - strong - medium - weak, 0)

            return {
                "strong": strong,
                "medium": medium,
                "weak": weak,
                "pool": pool_count
            }

    except Exception as e:
        logger.error(f"获取信号分布数据失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/latest-trade-date")
async def get_latest_trade_date(db=Depends(get_db)):
    """获取最新交易日期"""
    async with db.cursor() as cursor:
        await cursor.execute("SELECT MAX(trade_date) FROM b1_signal_results")
        row = await cursor.fetchone()
        return {"trade_date": str(row[0]) if row and row[0] else None}


def _empty_overview():
    return {
        "activeMarketCap": "0",
        "marketSentiment": "无数据",
        "sentimentChange": 0,
        "upStocks": 0,
        "downStocks": 0,
        "flatStocks": 0,
        "totalStocks": 0,
        "latestTradeDate": None,
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
