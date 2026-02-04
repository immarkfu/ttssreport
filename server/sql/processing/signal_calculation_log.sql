-- ==========================================
-- 信号加工数据日志表
-- 用途：记录每日B1/S1信号计算的执行情况
-- ==========================================

USE ttssreport;

CREATE TABLE IF NOT EXISTS signal_calculation_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    trade_date VARCHAR(8) NOT NULL COMMENT '交易日期(YYYYMMDD)',
    signal_type VARCHAR(10) NOT NULL COMMENT '信号类型(B1/S1)',
    
    -- 计算统计
    total_stocks INT DEFAULT 0 COMMENT '总股票数',
    calculated_stocks INT DEFAULT 0 COMMENT '已计算股票数',
    matched_stocks INT DEFAULT 0 COMMENT '匹配的股票数',
    strong_signals INT DEFAULT 0 COMMENT '强信号数量',
    medium_signals INT DEFAULT 0 COMMENT '中信号数量',
    weak_signals INT DEFAULT 0 COMMENT '弱信号数量',
    failed_stocks INT DEFAULT 0 COMMENT '计算失败的股票数',
    
    -- 执行信息
    status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态(pending/running/success/failed/partial)',
    start_time TIMESTAMP NULL DEFAULT NULL COMMENT '开始时间',
    end_time TIMESTAMP NULL DEFAULT NULL COMMENT '结束时间',
    duration_seconds INT DEFAULT NULL COMMENT '执行时长(秒)',
    error_message TEXT DEFAULT NULL COMMENT '错误信息',
    
    -- 配置快照
    config_snapshot JSON COMMENT '本次计算使用的配置快照',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    KEY idx_trade_date (trade_date),
    KEY idx_signal_type (signal_type),
    KEY idx_status (status),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='信号加工数据日志表';
