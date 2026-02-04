# TTSS Report - A股投资工具

## 项目结构

```
ttssreport/
├── client/              # 前端 (React + Vite + TailwindCSS)
├── server/              # 后端 (FastAPI + Tushare + MySQL)
│   ├── api/            # API 路由
│   ├── core/           # 核心配置
│   ├── models/         # 数据模型
│   ├── services/       # 业务逻辑
│   ├── scheduler/      # 定时任务
│   └── sql/           # 数据库脚本
├── docker-compose.yml   # Docker 容器编排
├── Dockerfile.backend  # 后端容器镜像
├── Dockerfile          # 前端容器镜像
├── .env.example        # 环境变量模板
└── .github/workflows/   # CI/CD 工作流
```

## 功能

- 市场概览
- 信号提醒
- K线图分析
- 数据定时同步

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
```

### 2. 使用 Docker 启动

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 3. 本地开发

```bash
# 前端开发
pnpm run dev

# 后端开发
cd server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## CI/CD

GitHub Actions 自动执行：
- 前端类型检查和构建
- 后端测试
- Docker 镜像构建和推送
- 自动部署（main 分支）

## 技术栈

### 前端
- React 19
- Vite
- TailwindCSS
- Radix UI
- TanStack Query
- lightweight-charts

### 后端
- FastAPI
- Tushare Pro
- MySQL 8.0
- Uvicorn
- Schedule

## 仓库整合说明

本项目已整合前后端：
- 前端：原 `immarkfu/ttssreport`
- 后端：原 `dongxuanye/ttssreport-backend`

后端代码已迁移至 `server/` 目录，统一在一个仓库中管理。
