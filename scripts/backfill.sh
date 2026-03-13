#!/bin/bash
# =============================================================================
# TTSS Report 数据补拉运维脚本
# 用途：补拉 tushare 行情数据 + 补算 B1 信号，适用于数据缺口修复
#
# 使用方式（在应用服务器上执行）：
#   bash scripts/backfill.sh [start_date] [end_date]
#
# 参数说明：
#   start_date  开始日期，格式 YYYYMMDD，默认从数据库最新日期的下一个交易日开始
#   end_date    结束日期，格式 YYYYMMDD，默认为昨天
#
# 示例：
#   bash scripts/backfill.sh                        # 自动补全到昨天
#   bash scripts/backfill.sh 20260213 20260311      # 补拉指定区间
#   bash scripts/backfill.sh 20260312 20260312      # 只补拉某一天
#
# 注意：
#   - tushare 数据通常在每个交易日 17:30 后才可用，当天数据请勿补拉
#   - 每个交易日补拉约需 30-60 秒（含 bak_daily + stk_factor_pro）
#   - B1 信号补算在行情数据补拉完成后自动执行
# =============================================================================

set -e

CONTAINER_NAME="ttssreport-backend"
START_DATE="${1:-}"
END_DATE="${2:-}"

# 检查容器是否运行
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[ERROR] 容器 ${CONTAINER_NAME} 未运行，请先启动服务"
    exit 1
fi

echo "======================================================"
echo "TTSS Report 数据补拉任务"
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"

# 构建 Python 命令
PYTHON_CMD=$(cat << 'PYEOF'
import sys
sys.path.insert(0, '/app')
from scheduler.tushare_job import TushareDataIntegrator
from scheduler.b1_signal_job import backfill_b1_signals
from core.config import settings
import os

start_date = os.environ.get('BACKFILL_START', None)
end_date = os.environ.get('BACKFILL_END', None)

print(f"[Step 1] 补拉 tushare 行情数据: {start_date or '自动'} ~ {end_date or '昨天'}")
integrator = TushareDataIntegrator(settings.TUSHARE_TOKEN, settings.db_config)
result = integrator.backfill_missing_dates(start_date=start_date, end_date=end_date)
integrator.close()

if result.get('message') == '没有需要补拉的交易日':
    print("[Step 1] 行情数据已是最新，无需补拉")
else:
    print(f"[Step 1] 完成: 共 {result.get('total', 0)} 个交易日，成功 {result.get('success_count', 0)} 个")
    for r in result.get('results', []):
        date = r.get('date', '')
        if r.get('success'):
            bak = r.get('result', {}).get('bak_daily', {})
            stk = r.get('result', {}).get('stk_factor_pro', {})
            print(f"  {date}: bak_daily={bak.get('inserted', 0)}条/{bak.get('status','?')}  stk_factor={stk.get('inserted', 0)}条/{stk.get('status','?')}")
        else:
            print(f"  {date}: 失败 - {r.get('error', '未知错误')}")

print()
print(f"[Step 2] 补算 B1 信号: {start_date or '自动'} ~ {end_date or '最新'}")
b1_result = backfill_b1_signals(start_date=start_date, end_date=end_date)
if b1_result.get('message') == '没有需要补拉的交易日':
    print("[Step 2] B1 信号已是最新，无需补算")
else:
    print(f"[Step 2] 完成: 共 {b1_result.get('total', 0)} 个交易日，成功 {b1_result.get('success_count', 0)} 个")

print()
print("全部完成!")
PYEOF
)

# 在容器内执行
docker exec \
    -e BACKFILL_START="${START_DATE}" \
    -e BACKFILL_END="${END_DATE}" \
    "${CONTAINER_NAME}" \
    python3 -c "${PYTHON_CMD}"

echo "======================================================"
echo "结束时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"
