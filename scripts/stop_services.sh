#!/bin/bash

# 停止所有服务脚本

set -e

echo "========================================="
echo "停止TTSS Report所有服务"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 停止Node.js服务
echo -e "${YELLOW}[1/2] 停止Node.js API服务...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 stop ttssreport-api 2>/dev/null || echo "服务未运行"
    echo -e "${GREEN}✓ Node.js API服务已停止${NC}"
else
    echo -e "${YELLOW}警告: pm2未安装${NC}"
fi
echo ""

# 停止Python定时任务
echo -e "${YELLOW}[2/2] 停止Python定时任务...${NC}"
if systemctl is-active --quiet ttssreport-scheduler 2>/dev/null; then
    sudo systemctl stop ttssreport-scheduler
    echo -e "${GREEN}✓ Python定时任务已停止${NC}"
else
    echo -e "${YELLOW}警告: systemd服务未运行${NC}"
fi
echo ""

echo "========================================="
echo -e "${GREEN}所有服务已停止！${NC}"
echo "========================================="
echo ""
