#!/bin/bash

# 启动所有服务脚本

set -e

echo "========================================="
echo "启动TTSS Report所有服务"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 启动Node.js服务
echo -e "${YELLOW}[1/2] 启动Node.js API服务...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 start "pnpm start" --name ttssreport-api 2>/dev/null || pm2 restart ttssreport-api
    echo -e "${GREEN}✓ Node.js API服务已启动${NC}"
else
    echo -e "${RED}错误: pm2未安装，请先安装: npm install -g pm2${NC}"
    exit 1
fi
echo ""

# 启动Python定时任务
echo -e "${YELLOW}[2/2] 启动Python定时任务...${NC}"
if systemctl is-active --quiet ttssreport-scheduler 2>/dev/null; then
    sudo systemctl restart ttssreport-scheduler
    echo -e "${GREEN}✓ Python定时任务已启动（systemd）${NC}"
else
    echo -e "${YELLOW}警告: systemd服务未配置，请手动启动Python定时任务：${NC}"
    echo "  python3 python/scheduler/main.py --start"
fi
echo ""

echo "========================================="
echo -e "${GREEN}所有服务已启动！${NC}"
echo "========================================="
echo ""
echo "查看服务状态："
echo "  Node.js API: pm2 status"
echo "  Python调度器: sudo systemctl status ttssreport-scheduler"
echo ""
echo "查看日志："
echo "  Node.js API: pm2 logs ttssreport-api"
echo "  Python调度器: tail -f logs/scheduler/scheduler.log"
echo ""
