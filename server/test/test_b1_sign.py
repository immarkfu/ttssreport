from scheduler.b1_signal_job import run_b1_signal_calculation
from datetime import datetime, timedelta

if __name__ == "__main__":

    # 计算昨天的B1信号
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y%m%d')
    run_b1_signal_calculation(yesterday)