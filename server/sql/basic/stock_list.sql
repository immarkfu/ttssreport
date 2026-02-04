-- 股票列表表（基础表）
DROP TABLE IF EXISTS stock_list;

CREATE TABLE IF NOT EXISTS stock_list (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    ts_code VARCHAR(20) NOT NULL UNIQUE COMMENT '股票代码',
    symbol VARCHAR(10) COMMENT '股票简称',
    `name` VARCHAR(50) COMMENT '股票名称',
    `area` VARCHAR(50) COMMENT '地域',
    industry VARCHAR(100) COMMENT '行业',
    cnspell VARCHAR(20) COMMENT '拼音缩写',
    market VARCHAR(20) COMMENT '市场(主板/创业板/科创板)',
    list_date VARCHAR(8) COMMENT '上市日期',
    act_name VARCHAR(200) COMMENT '实际控制人',
    act_ent_type VARCHAR(50) COMMENT '实际控制人类型',
    is_active TINYINT DEFAULT 1 COMMENT '是否活跃(1=是,0=否)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY idx_ts_code (ts_code),
    KEY idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='股票代码列表表';
