# TTSS Report Python后端模块

本目录包含TTSS Report项目的Python后端模块，负责数据集成、标签计算和定时任务调度。

## 📁 目录结构

```
python/
├── data_integration/     # Tushare数据集成模块
│   ├── __init__.py
│   └── core.py          # 数据集成核心逻辑
├── tag_calculation/      # 标签计算模块
│   ├── __init__.py
│   ├── engine.py        # 标签计算引擎
│   └── calculators/     # 标签计算器
│       ├── __init__.py
│       ├── p0_tags.py   # P0标签计算（已实现）
│       ├── p1_tags.py   # P1标签计算（待实现）
│       └── p2_tags.py   # P2标签计算（待实现）
├── scheduler/            # 定时任务模块
│   ├── __init__.py
│   ├── scheduler.py     # 调度器
│   └── main.py          # 主程序入口
├── common/               # 公共模块
│   ├── __init__.py
│   ├── config.py        # 配置管理
│   ├── database.py      # 数据库连接
│   ├── logger.py        # 日志管理
│   └── notification.py  # 邮件通知
├── scripts/              # 脚本工具
│   ├── run_integration.py      # 手动执行数据集成
│   ├── run_tag_calculation.py  # 手动执行标签计算
│   └── integrate_modules.py    # 模块整合脚本
├── tests/                # 测试
│   └── __init__.py
├── requirements.txt      # Python依赖
├── setup.py             # 安装配置
└── README.md            # 本文件
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd python
pip install -r requirements.txt
```

或者使用开发模式安装：

```bash
cd python
pip install -e .
```

### 2. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
# 数据库配置
DATABASE_HOST=mysql-2579b2bfcbcb-public.rds.volces.com
DATABASE_PORT=3306
DATABASE_USER=bestismark
DATABASE_PASSWORD=Aa123456
DATABASE_NAME=ttssreport

# Tushare配置
TUSHARE_API_KEY=your_tushare_api_key

# 邮件配置
SMTP_HOST=smtp.126.com
SMTP_PORT=465
SMTP_USER=bestismark@126.com
SMTP_PASSWORD=your_password
SMTP_FROM=bestismark@126.com
SMTP_TO=bestismark@126.com

# 应用配置
NODE_ENV=production
LOG_LEVEL=INFO
```

### 3. 测试配置

```bash
python -m common.config
python -m common.database
python -m common.logger
```

### 4. 运行服务

#### 启动定时调度器

```bash
python -m scheduler.main --start
```

#### 手动执行数据集成

```bash
python scripts/run_integration.py
```

#### 手动执行标签计算

```bash
python scripts/run_tag_calculation.py
```

## 📦 模块说明

### data_integration - 数据集成模块

负责从Tushare获取A股数据并存储到MySQL数据库。

**主要功能**：
- 获取备用行情数据（bak_daily）
- 获取技术面因子数据（stk_factor_pro）
- 数据清洗和转换
- 增量更新到数据库

**使用示例**：

```python
from data_integration.core import TushareDataIntegrator
from common.config import config

integrator = TushareDataIntegrator(
    tushare_token=config.TUSHARE_API_KEY,
    db_config=config.get_db_config()
)

# 集成最新交易日数据
result = integrator.integrate_latest_data()
```

### tag_calculation - 标签计算模块

负责基于配置标签库计算股票标签。

**主要功能**：
- 标签计算引擎
- P0核心标签计算（6个）
- P1重要标签计算（9个，待实现）
- P2复杂标签计算（2个，待实现）

**使用示例**：

```python
from tag_calculation.engine import TagCalculationEngine
from common.database import get_db_connection

with get_db_connection() as db:
    engine = TagCalculationEngine(db)
    result = engine.calculate_tags('20240120')
```

### scheduler - 定时任务模块

负责定时调度数据集成和标签计算任务。

**主要功能**：
- 交易日历判断
- 每日17:30自动执行
- 任务编排和错误处理
- 邮件通知

**使用示例**：

```bash
# 启动调度器
python -m scheduler.main --start

# 测试交易日历
python -m scheduler.main --test-calendar

# 执行一次任务
python -m scheduler.main --run-once
```

### common - 公共模块

提供通用的配置、数据库、日志和通知功能。

**主要功能**：
- 统一配置管理
- 数据库连接池
- 日志记录
- 邮件通知

## 🔧 开发指南

### 添加新的标签计算器

1. 在 `tag_calculation/calculators/` 目录下创建新文件
2. 实现标签计算函数
3. 在 `tag_calculation/engine.py` 中注册新标签

示例：

```python
# tag_calculation/calculators/my_tag.py
def calculate_my_tag(df):
    """计算我的标签"""
    return df['close'] > df['open']

# tag_calculation/engine.py
from .calculators.my_tag import calculate_my_tag

class TagCalculationEngine:
    def __init__(self, db):
        self.calculators = {
            'my_tag': calculate_my_tag,
            # ...
        }
```

### 添加新的定时任务

在 `scheduler/tasks.py` 中添加新任务：

```python
def my_task():
    """我的定时任务"""
    logger.info("执行我的任务")
    # 任务逻辑
```

在 `scheduler/scheduler.py` 中注册任务：

```python
scheduler.add_job(
    my_task,
    trigger='cron',
    hour=18,
    minute=0
)
```

## 📊 性能优化

### 数据库连接池

使用SQLAlchemy连接池管理数据库连接：

```python
from common.database import get_db_connection

with get_db_connection() as db:
    # 自动管理连接的打开和关闭
    results = db.query("SELECT * FROM stocks")
```

### 批量操作

使用批量插入提高性能：

```python
db.executemany(
    "INSERT INTO table (col1, col2) VALUES (%s, %s)",
    [(val1, val2), (val3, val4), ...]
)
```

### 日志轮转

日志文件自动按时间或大小轮转，避免文件过大。

## 🐛 故障排查

### 数据库连接失败

1. 检查环境变量配置
2. 检查数据库服务是否启动
3. 检查网络连接和防火墙规则

```bash
python -m common.database
```

### Tushare API调用失败

1. 检查API密钥是否正确
2. 检查API积分是否充足
3. 检查网络连接

### 邮件发送失败

1. 检查SMTP配置
2. 检查邮箱授权码
3. 检查邮件服务器连接

```bash
python -m common.notification
```

## 📝 日志文件

日志文件保存在项目根目录的 `logs/` 目录下：

```
logs/
├── data_integration/
│   └── integration.log
├── tag_calculation/
│   └── calculation.log
└── scheduler/
    └── scheduler.log
```

## 🔒 安全注意事项

1. **不要提交 `.env` 文件到Git**
2. **定期更换数据库密码和API密钥**
3. **使用环境变量管理敏感信息**
4. **限制数据库用户权限**

## 📞 技术支持

如有问题，请联系：
- 邮箱：bestismark@126.com
- GitHub：https://github.com/immarkfu/ttssreport

## 📄 许可证

Copyright © 2024 TTSS Team. All rights reserved.
