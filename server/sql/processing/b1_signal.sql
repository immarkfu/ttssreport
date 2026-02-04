-- ==========================================
-- B1买点信号加工数据表
-- 数据来源：基于bak_daily和stk_factor_pro计算得出
-- 用途：存储每日计算出的B1买点信号
-- ==========================================

USE ttssreport;

CREATE TABLE IF NOT EXISTS b1_signal_results (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    ts_code VARCHAR(20) NOT NULL COMMENT 'TS股票代码',
    stock_name VARCHAR(100) COMMENT '股票名称',
    trade_date DATE NOT NULL COMMENT '交易日期',
    
    -- 信号分类
    signal_strength ENUM('strong', 'medium', 'weak') DEFAULT 'medium' COMMENT '信号强度',
    
    -- 价格信息
    close_price DECIMAL(15, 4) COMMENT '收盘价',
    open_price DECIMAL(15, 4) COMMENT '开盘价',
    high_price DECIMAL(15, 4) COMMENT '最高价',
    low_price DECIMAL(15, 4) COMMENT '最低价',
    price_change DECIMAL(15, 4) COMMENT '涨跌额',
    pct_change DECIMAL(10, 4) COMMENT '涨跌幅(%)',
    
    -- 成交信息
    volume BIGINT COMMENT '成交量(手)',
    amount DECIMAL(20, 2) COMMENT '成交额(千元)',
    volume_ratio DECIMAL(10, 4) COMMENT '量比',
    turnover_rate DECIMAL(10, 4) COMMENT '换手率(%)',
    
    -- 核心技术指标
    j_value DECIMAL(10, 4) COMMENT 'KDJ-J值',
    k_value DECIMAL(10, 4) COMMENT 'KDJ-K值',
    d_value DECIMAL(10, 4) COMMENT 'KDJ-D值',
    macd_dif DECIMAL(15, 4) COMMENT 'MACD-DIF值',
    macd_dea DECIMAL(15, 4) COMMENT 'MACD-DEA值',
    macd_value DECIMAL(15, 4) COMMENT 'MACD柱值',
    
    -- 市值信息
    total_mv DECIMAL(20, 2) COMMENT '总市值(万元)',
    circ_mv DECIMAL(20, 2) COMMENT '流通市值(万元)',
    
    -- 分类信息
    industry VARCHAR(50) COMMENT '所属行业',
    area VARCHAR(50) COMMENT '所属地域',
    
    -- 触发条件
    trigger_time TIMESTAMP COMMENT '触发时间',
    trigger_condition VARCHAR(500) COMMENT '触发条件描述',
    
    -- 展示要素(多标签组合)
    display_factor TEXT COMMENT '展示要素(如: J<13, MACD>0, 红肥绿瘦, 量比>1.5)',
    
    -- 匹配标签
    matched_tag_ids JSON COMMENT '匹配的标签ID列表',
    matched_tag_names JSON COMMENT '匹配的标签名称列表',
    matched_tag_codes JSON COMMENT '匹配的标签code列表'
    plus_tags_count INT DEFAULT 0 COMMENT '加分项数量',
    minus_tags_count INT DEFAULT 0 COMMENT '减分项数量',
    tag_score INT DEFAULT 0 COMMENT '标签得分(加分项-减分项)',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    UNIQUE KEY uk_ts_code_trade_date (ts_code, trade_date),
    KEY idx_trade_date (trade_date),
    KEY idx_signal_strength (signal_strength),
    KEY idx_tag_score (tag_score DESC),
    KEY idx_industry (industry),
    KEY idx_j_value (j_value),
    KEY idx_volume_ratio (volume_ratio),
    KEY idx_pct_change (pct_change)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='B1买点信号加工数据表';
