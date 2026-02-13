-- ==========================================
-- 用户观察池表
-- 每个用户可以添加股票到自己的观察池
-- ==========================================

USE ttssreport;

CREATE TABLE IF NOT EXISTS user_watchlist (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    user_id INT NOT NULL COMMENT '用户ID',
    ts_code VARCHAR(20) NOT NULL COMMENT 'TS股票代码',
    stock_name VARCHAR(100) COMMENT '股票名称',

    -- 用户备注
    note TEXT COMMENT '备注说明',

    -- 状态
    is_active TINYINT DEFAULT 1 COMMENT '是否启用(1=启用，0=禁用)',

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    UNIQUE KEY uk_user_id_ts_code (user_id, ts_code),
    KEY idx_user_id (user_id),
    KEY idx_ts_code (ts_code),
    KEY idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户观察池表';
