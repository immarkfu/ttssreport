# 多租户数据隔离设计

## 数据分类

### 全局数据（所有用户一致）
1. **总览仪表盘（除观察卡片外）**
   - 当日总市值
   - 今日B1触发（26/4821）
   - 持仓卖出预警
   - 昨日观察胜率
   - 知行趋势指标模拟
   - 今日B1信号全景分析

2. **每日B1观察提醒**
   - B1信号列表（所有股票）
   - 股票基本信息（代码、名称、行业、现价、涨跌幅、强度、展示要素）
   - K线图数据

3. **每日S1卖出提醒**
   - S1信号列表（所有股票）
   - 股票基本信息
   - K线图数据

### 用户个性化数据（多租户隔离）
1. **总览仪表盘（观察卡片）**
   - 用户自己的观察池股票数量和统计

2. **观察分析看板**
   - 用户自己的观察池股票列表
   - 纳入日期、表现数据
   - 胜率统计

3. **TTSS战法配置**
   - 用户自己的策略参数配置

## 数据库表设计

### 已有表
- `users` - 用户基本信息
- `user_configs` - 用户TTSS战法配置（已包含backtestPool字段）
- `observation_pool` - 用户观察池股票记录

### 数据隔离实现
- 所有个性化数据表都包含 `userId` 字段
- API层面通过 `protectedProcedure` 自动获取 `ctx.user.id`
- 查询时自动过滤：`WHERE userId = ctx.user.id`

## API设计

### 全局数据API（publicProcedure）
```typescript
// 无需登录即可访问
dashboard.getMarketOverview.query()
signals.getB1List.query()
signals.getS1List.query()
```

### 个性化数据API（protectedProcedure）
```typescript
// 需要登录，自动隔离用户数据
observation.getMyPool.query() // 获取我的观察池
observation.addToPool.mutation() // 加入观察池
observation.removeFromPool.mutation() // 移出观察池
config.get.query() // 获取我的配置
config.update.mutation() // 更新我的配置
```

## 前端实现

### 状态管理
- 全局数据：直接从API获取，不区分用户
- 个性化数据：需要登录后才能访问，自动获取当前用户数据

### 账号切换
- 用户登出后，清除所有个性化数据缓存
- 用户登录后，重新加载个性化数据
- 使用tRPC的 `invalidate` 机制自动刷新数据

## 测试场景
1. 用户A登录，加入观察池股票
2. 用户A登出，用户B登录
3. 验证用户B看不到用户A的观察池数据
4. 用户B加入自己的观察池股票
5. 用户B登出，用户A重新登录
6. 验证用户A仍能看到自己之前加入的股票，看不到用户B的数据
