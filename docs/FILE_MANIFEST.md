# TTSS Report 文件清单

本文档列出了整合后的所有关键文件。

**生成时间**: 2024-01-20  
**文件总数**: 160+

---

## 📁 目录结构

```
ttssreport/
├── client/                   # React前端
│   ├── src/
│   │   ├── pages/           # 7个页面组件
│   │   ├── components/      # 通用组件
│   │   └── lib/             # 工具库
│   └── package.json
├── server/                   # Node.js后端
│   ├── routers/             # 7个tRPC路由
│   ├── _core/               # 核心模块
│   └── db.ts
├── python/                   # Python后端
│   ├── data_integration/    # 数据集成
│   ├── tag_calculation/     # 标签计算
│   ├── scheduler/           # 定时任务
│   ├── common/              # 公共模块
│   └── scripts/             # 脚本工具
├── drizzle/                  # 数据库Schema (5个)
├── sql/                      # SQL脚本 (4个)
├── scripts/                  # 部署脚本 (4个)
├── docs/                     # 文档 (3个)
└── logs/                     # 日志目录
```

---

## 🔑 关键文件列表

### 前端核心文件 (React)

**页面组件** (7个):
- `client/src/pages/Home.tsx` - 主页（包含所有视图）
- `client/src/pages/ConfigTags/index.tsx` - 配置标签管理 ⭐ 新增
- `client/src/pages/StockFilter/index.tsx` - 股票筛选 ⭐ 新增
- `client/src/pages/NotFound.tsx` - 404页面
- `client/src/pages/Dashboard/` - 总览仪表盘
- `client/src/pages/B1Signals/` - B1观察提醒
- `client/src/pages/S1Signals/` - S1卖出提醒

**布局组件** (3个):
- `client/src/components/layout/Sidebar.tsx` - 侧边栏导航 ⭐ 已更新
- `client/src/components/layout/Header.tsx` - 页头
- `client/src/components/ErrorBoundary.tsx` - 错误边界

**核心配置** (3个):
- `client/src/App.tsx` - 主应用 ⭐ 已更新
- `client/src/lib/trpc.ts` - tRPC客户端
- `client/src/lib/utils.ts` - 工具函数

### 后端核心文件 (Node.js)

**tRPC路由** (7个):
- `server/routers.ts` - 主路由 ⭐ 已更新
- `server/routers/configTags.ts` - 配置标签API ⭐ 新增
- `server/routers/stockFilter.ts` - 股票筛选API ⭐ 新增
- `server/routers/system.ts` - 系统API
- `server/routers/auth.ts` - 认证API
- `server/routers/config.ts` - 配置API
- `server/routers/observation.ts` - 观察池API

**数据库** (2个):
- `server/db.ts` - 数据库连接 ⭐ 已更新
- `server/_core/index.ts` - 核心服务

### Python后端文件

**数据集成模块** (2个):
- `python/data_integration/__init__.py`
- `python/data_integration/core.py` - 数据集成核心 ⭐ 新增

**标签计算模块** (4个):
- `python/tag_calculation/__init__.py`
- `python/tag_calculation/engine.py` - 标签计算引擎 ⭐ 新增
- `python/tag_calculation/calculators/__init__.py`
- `python/tag_calculation/calculators/p0_tags.py` - P0标签 ⭐ 新增

**定时任务模块** (3个):
- `python/scheduler/__init__.py`
- `python/scheduler/scheduler.py` - 调度器 ⭐ 新增
- `python/scheduler/main.py` - 主程序入口 ⭐ 新增

**公共模块** (5个):
- `python/common/__init__.py`
- `python/common/config.py` - 配置管理 ⭐ 新增
- `python/common/database.py` - 数据库连接 ⭐ 新增
- `python/common/logger.py` - 日志管理 ⭐ 新增
- `python/common/notification.py` - 邮件通知 ⭐ 新增

**脚本工具** (4个):
- `python/scripts/run_integration.py` - 手动执行数据集成 ⭐ 新增
- `python/scripts/run_tag_calculation.py` - 手动执行标签计算 ⭐ 新增
- `python/scripts/integrate_modules.py` - 模块整合脚本 ⭐ 新增
- `python/scripts/__init__.py`

**配置文件** (3个):
- `python/requirements.txt` - Python依赖 ⭐ 新增
- `python/setup.py` - 安装配置 ⭐ 新增
- `python/README.md` - Python模块文档 ⭐ 新增

### 数据库Schema文件

**Drizzle Schema** (5个):
- `drizzle/schema.ts` - Schema汇总 ⭐ 已更新
- `drizzle/schema_config_tags.ts` - 配置标签Schema ⭐ 新增
- `drizzle/schema_stock_tags.ts` - 股票标签Schema ⭐ 新增
- `drizzle/0000_*.sql` - 数据库迁移文件
- `drizzle/meta/*.json` - 迁移元数据

### SQL脚本文件

**建表脚本** (3个):
- `sql/create_tushare_tables.sql` - Tushare数据表 ⭐ 新增
- `sql/create_config_tags_tables.sql` - 配置标签表 ⭐ 新增
- `sql/create_stock_tag_tables.sql` - 股票标签表 ⭐ 新增

**初始化脚本** (1个):
- `sql/init_config_tags_data.sql` - 配置标签初始数据 ⭐ 新增

### 部署脚本文件

**Shell脚本** (3个):
- `scripts/deploy.sh` - 部署脚本 ⭐ 新增
- `scripts/start_services.sh` - 启动所有服务 ⭐ 新增
- `scripts/stop_services.sh` - 停止所有服务 ⭐ 新增

**系统服务** (1个):
- `scripts/ttssreport-scheduler.service` - systemd服务配置 ⭐ 新增

### 配置文件

**环境变量** (2个):
- `.env` - 环境变量（实际配置）⭐ 新增
- `.env.example` - 环境变量模板 ⭐ 新增

**项目配置** (4个):
- `package.json` - Node.js项目配置
- `tsconfig.json` - TypeScript配置
- `vite.config.ts` - Vite配置
- `tailwind.config.ts` - TailwindCSS配置

**Git配置** (2个):
- `.gitignore` - Git忽略文件
- `.gitattributes` - Git属性文件

### 文档文件

**项目文档** (3个):
- `README.md` - 项目主文档 ⭐ 已更新
- `docs/INTEGRATION_SUMMARY.md` - 整合总结 ⭐ 新增
- `docs/FILE_MANIFEST.md` - 文件清单（本文件）⭐ 新增

**模块文档** (1个):
- `python/README.md` - Python模块文档 ⭐ 新增

---

## 📊 文件统计

### 按类型统计

| 文件类型 | 数量 | 说明 |
|---------|------|------|
| TypeScript (*.ts) | 40+ | Node.js后端和类型定义 |
| TSX (*.tsx) | 30+ | React组件 |
| Python (*.py) | 20+ | Python后端模块 |
| SQL (*.sql) | 4 | 数据库脚本 |
| Shell (*.sh) | 3 | 部署脚本 |
| Markdown (*.md) | 5+ | 文档 |
| JSON | 10+ | 配置文件 |
| 其他 | 50+ | CSS、图片等 |

### 按模块统计

| 模块 | 文件数 | 代码行数（估算） |
|------|--------|-----------------|
| 前端（React） | 60+ | 8,000+ |
| 后端（Node.js） | 30+ | 3,000+ |
| 后端（Python） | 20+ | 2,500+ |
| SQL脚本 | 4 | 500+ |
| 部署脚本 | 4 | 300+ |
| 文档 | 5+ | 3,000+ |
| **总计** | **160+** | **17,000+** |

---

## ⭐ 新增文件标记

本次整合新增的文件已用 ⭐ 标记，主要包括：

### Python后端（20+个文件）
- 数据集成模块
- 标签计算模块
- 定时任务模块
- 公共模块
- 脚本工具

### Node.js后端（4个文件）
- 配置标签API路由
- 股票筛选API路由
- 配置标签Schema
- 股票标签Schema

### React前端（2个文件）
- 配置标签管理页面
- 股票筛选页面

### SQL脚本（4个文件）
- Tushare数据表
- 配置标签表
- 股票标签表
- 配置标签初始数据

### 部署脚本（4个文件）
- 部署脚本
- 启动服务脚本
- 停止服务脚本
- systemd服务配置

### 配置和文档（5个文件）
- 环境变量配置
- 项目主文档
- 整合总结
- Python模块文档
- 文件清单

---

## 🔍 快速查找

### 查找特定功能的文件

**配置标签管理**:
- 前端: `client/src/pages/ConfigTags/index.tsx`
- 后端: `server/routers/configTags.ts`
- Schema: `drizzle/schema_config_tags.ts`
- SQL: `sql/create_config_tags_tables.sql`

**股票筛选**:
- 前端: `client/src/pages/StockFilter/index.tsx`
- 后端: `server/routers/stockFilter.ts`
- Schema: `drizzle/schema_stock_tags.ts`
- SQL: `sql/create_stock_tag_tables.sql`

**数据集成**:
- Python: `python/data_integration/core.py`
- SQL: `sql/create_tushare_tables.sql`
- 脚本: `python/scripts/run_integration.py`

**标签计算**:
- Python: `python/tag_calculation/engine.py`
- 计算器: `python/tag_calculation/calculators/p0_tags.py`
- 脚本: `python/scripts/run_tag_calculation.py`

**定时任务**:
- Python: `python/scheduler/main.py`
- 调度器: `python/scheduler/scheduler.py`
- 服务: `scripts/ttssreport-scheduler.service`

---

## 📝 文件命名规范

### Python文件
- 模块名: 小写+下划线 (snake_case)
- 类名: 大驼峰 (PascalCase)
- 函数名: 小写+下划线 (snake_case)

### TypeScript/TSX文件
- 组件名: 大驼峰 (PascalCase)
- 文件名: 大驼峰 (PascalCase)
- 函数名: 小驼峰 (camelCase)

### SQL文件
- 表名: 小写+下划线 (snake_case)
- 字段名: 小驼峰 (camelCase)

### Shell脚本
- 文件名: 小写+下划线 (snake_case)
- 扩展名: .sh

---

## 🔄 文件更新记录

### 2024-01-20 整合更新

**新增文件** (40+):
- Python后端模块 (20+)
- Node.js API路由 (4)
- React页面组件 (2)
- SQL脚本 (4)
- 部署脚本 (4)
- 配置和文档 (5)

**修改文件** (10+):
- `server/routers.ts` - 添加新路由
- `server/db.ts` - 导出db实例
- `drizzle/schema.ts` - 导入新schema
- `client/src/App.tsx` - 添加新路由
- `client/src/components/layout/Sidebar.tsx` - 添加新菜单
- `README.md` - 更新项目文档
- 其他配置文件

---

**最后更新**: 2024-01-20  
**维护者**: TTSS Team
