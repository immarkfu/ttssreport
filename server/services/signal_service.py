from datetime import date
import pymysql

def calculate_signal_strength(j_value: float, macd: float) -> str:
    if j_value < 10 and macd > 0:
        return 'strong'
    elif j_value < 13 and macd > 0:
        return 'medium'
    else:
        return 'weak'

def calculate_volume_ratio(stock_code: str, trade_date: date, conn) -> float:
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    cursor.execute("""
        SELECT volume FROM history_stock_data 
        WHERE stock_code = %s AND trade_date <= %s 
        ORDER BY trade_date DESC LIMIT 6
    """, (stock_code, trade_date))
    volumes = cursor.fetchall()
    cursor.close()
    
    if len(volumes) < 6:
        return 1.0
    
    current_vol = volumes[0]['volume']
    avg_vol = sum(v['volume'] for v in volumes[1:6]) / 5
    
    return round(current_vol / avg_vol, 2) if avg_vol > 0 else 1.0

def calculate_red_green_ratio(stock_code: str, trade_date: date, conn) -> float:
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    cursor.execute("""
        SELECT pct_chg, volume FROM history_stock_data 
        WHERE stock_code = %s AND trade_date <= %s 
        ORDER BY trade_date DESC LIMIT 10
    """, (stock_code, trade_date))
    data = cursor.fetchall()
    cursor.close()
    
    red_vol = sum(d['volume'] for d in data if d['pct_chg'] > 0)
    green_vol = sum(d['volume'] for d in data if d['pct_chg'] < 0)
    
    return round(red_vol / green_vol, 2) if green_vol > 0 else 0
