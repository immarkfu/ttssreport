-- ==========================================
-- 备用行情基础数据表
-- 数据来源：Tushare bak_daily接口
-- 用途：作为B1/S1信号计算的基础数据
-- 注意：open/high/low/close/change为MySQL关键字，使用反引号转义
-- ==========================================

USE ttssreport;

CREATE TABLE IF NOT EXISTS bak_daily_data (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    ts_code VARCHAR(20) NOT NULL COMMENT 'TS股票代码',
    trade_date VARCHAR(8) NOT NULL COMMENT '交易日期(YYYYMMDD)',
    name VARCHAR(50) COMMENT '股票名称',
    
    -- 价格数据
    `open` DECIMAL(15, 4) COMMENT '开盘价',
    `high` DECIMAL(15, 4) COMMENT '最高价',
    `low` DECIMAL(15, 4) COMMENT '最低价',
    `close` DECIMAL(15, 4) COMMENT '收盘价',
    pre_close DECIMAL(15, 4) COMMENT '昨收价',
    `change` DECIMAL(15, 4) COMMENT '涨跌额',
    pct_change DECIMAL(10, 4) COMMENT '涨跌幅(%)',
    
    -- 成交数据
    vol BIGINT COMMENT '成交量(手)',
    amount DECIMAL(20, 2) COMMENT '成交额(千元)',
    selling BIGINT COMMENT '内盘-主动卖(手)',
    buying BIGINT COMMENT '外盘-主动买(手)',
    
    -- 技术指标
    vol_ratio DECIMAL(10, 4) COMMENT '量比',
    turn_over DECIMAL(10, 4) COMMENT '换手率(%)',
    swing DECIMAL(10, 4) COMMENT '振幅(%)',
    avg_price DECIMAL(15, 4) COMMENT '平均价',
    
    -- 估值数据
    pe DECIMAL(15, 4) COMMENT '市盈率(动)',
    total_share DECIMAL(15, 4) COMMENT '总股本(亿)',
    float_share DECIMAL(15, 4) COMMENT '流通股本(亿)',
    total_mv DECIMAL(20, 2) COMMENT '总市值(万元)',
    float_mv DECIMAL(20, 2) COMMENT '流通市值(万元)',
    
    -- 分类信息
    industry VARCHAR(50) COMMENT '所属行业',
    area VARCHAR(50) COMMENT '所属地域',
    
    -- 特色指标
    strength DECIMAL(10, 4) COMMENT '强弱度(%)',
    activity DECIMAL(10, 4) COMMENT '活跃度(%)',
    avg_turnover DECIMAL(10, 4) COMMENT '笔换手',
    attack DECIMAL(10, 4) COMMENT '攻击波(%)',
    interval_3 DECIMAL(10, 4) COMMENT '近3月涨幅(%)',
    interval_6 DECIMAL(10, 4) COMMENT '近6月涨幅(%)',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    UNIQUE KEY uk_ts_code_trade_date (ts_code, trade_date),
    KEY idx_trade_date (trade_date),
    KEY idx_ts_code (ts_code),
    KEY idx_industry (industry),
    KEY idx_pct_change (pct_change),
    KEY idx_vol_ratio (vol_ratio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='备用行情基础数据表';
