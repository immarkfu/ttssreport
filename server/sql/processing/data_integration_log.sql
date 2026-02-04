-- ==========================================
-- 数据集成日志表
-- 用途：记录每日数据集成的执行情况
-- ==========================================

USE ttssreport;

CREATE TABLE IF NOT EXISTS data_integration_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    trade_date VARCHAR(8) NOT NULL COMMENT '交易日期(YYYYMMDD)',
    data_type VARCHAR(50) NOT NULL COMMENT '数据类型(bak_daily/stk_factor_pro/stock_list)',
    status VARCHAR(20) NOT NULL COMMENT '状态(success/failed/partial)',
    total_records INT COMMENT '总记录数',
    inserted_records INT COMMENT '插入记录数',
    updated_records INT COMMENT '更新记录数',
    error_message LONGTEXT COMMENT '错误信息',
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
    end_time TIMESTAMP NULL DEFAULT NULL COMMENT '结束时间',
    duration_seconds INT COMMENT '耗时(秒)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    KEY idx_trade_date (trade_date),
    KEY idx_data_type (data_type),
    KEY idx_status (status),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据集成日志表';
