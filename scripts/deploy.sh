#!/bin/bash

# TTSS Report 部署脚本
# 用于在火山云服务器上部署整个应用

set -e  # 遇到错误立即退出

echo "========================================="
echo "TTSS Report 部署脚本"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${YELLOW}[1/8] 检查环境...${NC}"
# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: Node.js未安装${NC}"
    exit 1
fi
echo "Node.js版本: $(node --version)"

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}错误: Python3未安装${NC}"
    exit 1
fi
echo "Python版本: $(python3 --version)"

# 检查pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm未安装，正在安装...${NC}"
    npm install -g pnpm
fi
echo "pnpm版本: $(pnpm --version)"

echo -e "${GREEN}✓ 环境检查完成${NC}"
echo ""

echo -e "${YELLOW}[2/8] 检查配置文件...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}警告: .env文件不存在，从.env.example复制...${NC}"
    cp .env.example .env
    echo -e "${RED}请编辑.env文件并填入正确的配置！${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 配置文件检查完成${NC}"
echo ""

echo -e "${YELLOW}[3/8] 安装Node.js依赖...${NC}"
pnpm install
echo -e "${GREEN}✓ Node.js依赖安装完成${NC}"
echo ""

echo -e "${YELLOW}[4/8] 安装Python依赖...${NC}"
cd python
sudo pip3 install -r requirements.txt
cd ..
echo -e "${GREEN}✓ Python依赖安装完成${NC}"
echo ""

echo -e "${YELLOW}[5/8] 构建前端...${NC}"
pnpm build
echo -e "${GREEN}✓ 前端构建完成${NC}"
echo ""

echo -e "${YELLOW}[6/8] 创建日志目录...${NC}"
mkdir -p logs/{data_integration,tag_calculation,scheduler}
chmod 755 logs
echo -e "${GREEN}✓ 日志目录创建完成${NC}"
echo ""

echo -e "${YELLOW}[7/8] 启动Node.js服务...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 stop ttssreport-api 2>/dev/null || true
    pm2 start "pnpm start" --name ttssreport-api
    pm2 save
    echo -e "${GREEN}✓ Node.js服务已启动（使用pm2）${NC}"
else
    echo -e "${YELLOW}警告: pm2未安装，请手动启动服务：pnpm start${NC}"
fi
echo ""

echo -e "${YELLOW}[8/8] 配置Python定时任务...${NC}"
echo "请手动配置systemd服务或使用cron："
echo "  方式1: sudo systemctl start ttssreport-scheduler"
echo "  方式2: crontab -e 添加定时任务"
echo ""

echo "========================================="
echo -e "${GREEN}部署完成！${NC}"
echo "========================================="
echo ""
echo "服务状态："
echo "  Node.js API: http://localhost:3000"
echo "  Python调度器: 需要手动启动"
echo ""
echo "下一步："
echo "  1. 检查.env配置是否正确"
echo "  2. 访问 http://localhost:3000 测试应用"
echo "  3. 启动Python定时任务"
echo "  4. 查看日志: pm2 logs ttssreport-api"
echo ""
