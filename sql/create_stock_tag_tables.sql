-- ==========================================
-- 股票标签结果表设计
-- 用于存储每日股票的标签计算结果
-- ==========================================

USE ttssreport;

-- 1. 股票标签结果表
CREATE TABLE IF NOT EXISTS stock_tag_results (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  ts_code VARCHAR(20) NOT NULL COMMENT '股票代码（如600519.SH）',
  stock_name VARCHAR(100) DEFAULT NULL COMMENT '股票名称',
  trade_date DATE NOT NULL COMMENT '交易日期',
  tag_id INT NOT NULL COMMENT '标签ID（关联strategy_config_tags表）',
  tag_name VARCHAR(100) NOT NULL COMMENT '标签名称（冗余字段，便于查询）',
  tag_value BOOLEAN NOT NULL DEFAULT FALSE COMMENT '标签值（TRUE=满足，FALSE=不满足）',
  strategy_type VARCHAR(50) NOT NULL COMMENT '战法类型（B1/S1）',
  category VARCHAR(20) NOT NULL COMMENT '分类（plus=加分项，minus=减分项）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 唯一索引：同一股票、同一日期、同一标签只能有一条记录
  UNIQUE KEY uk_stock_tag_date (ts_code, trade_date, tag_id),
  
  -- 查询优化索引
  KEY idx_trade_date (trade_date) COMMENT '按交易日期查询',
  KEY idx_ts_code (ts_code) COMMENT '按股票代码查询',
  KEY idx_tag_id (tag_id) COMMENT '按标签ID查询',
  KEY idx_strategy_type (strategy_type) COMMENT '按战法类型查询',
  KEY idx_tag_value (tag_value) COMMENT '按标签值查询',
  KEY idx_created_at (created_at) COMMENT '按创建时间查询（用于清理旧数据）',
  
  -- 组合索引：常用查询场景
  KEY idx_date_strategy_value (trade_date, strategy_type, tag_value) COMMENT '按日期+战法+标签值查询'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='股票标签结果表';

-- 2. 股票标签汇总表（可选，用于加速查询）
CREATE TABLE IF NOT EXISTS stock_tag_summary (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  ts_code VARCHAR(20) NOT NULL COMMENT '股票代码',
  stock_name VARCHAR(100) DEFAULT NULL COMMENT '股票名称',
  trade_date DATE NOT NULL COMMENT '交易日期',
  strategy_type VARCHAR(50) NOT NULL COMMENT '战法类型（B1/S1）',
  
  -- 标签统计
  total_tags INT DEFAULT 0 COMMENT '总标签数',
  matched_tags INT DEFAULT 0 COMMENT '匹配的标签数',
  plus_tags INT DEFAULT 0 COMMENT '加分项数量',
  minus_tags INT DEFAULT 0 COMMENT '减分项数量',
  tag_score INT DEFAULT 0 COMMENT '标签得分（加分项-减分项）',
  
  -- 匹配的标签列表（JSON格式）
  matched_tag_ids JSON DEFAULT NULL COMMENT '匹配的标签ID列表',
  matched_tag_names JSON DEFAULT NULL COMMENT '匹配的标签名称列表',
  
  -- 股票基本信息（冗余字段，便于查询）
  current_price DECIMAL(10, 2) DEFAULT NULL COMMENT '当日收盘价',
  price_change DECIMAL(10, 2) DEFAULT NULL COMMENT '涨跌额',
  pct_change DECIMAL(10, 4) DEFAULT NULL COMMENT '涨跌幅（%）',
  volume BIGINT DEFAULT NULL COMMENT '成交量',
  amount DECIMAL(20, 2) DEFAULT NULL COMMENT '成交额',
  total_mv DECIMAL(20, 2) DEFAULT NULL COMMENT '总市值（亿元）',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 唯一索引
  UNIQUE KEY uk_stock_date_strategy (ts_code, trade_date, strategy_type),
  
  -- 查询优化索引
  KEY idx_trade_date (trade_date),
  KEY idx_strategy_type (strategy_type),
  KEY idx_matched_tags (matched_tags),
  KEY idx_tag_score (tag_score),
  KEY idx_pct_change (pct_change),
  
  -- 组合索引
  KEY idx_date_strategy_score (trade_date, strategy_type, tag_score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='股票标签汇总表';

-- 3. 标签计算日志表
CREATE TABLE IF NOT EXISTS stock_tag_calculation_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  trade_date DATE NOT NULL COMMENT '交易日期',
  strategy_type VARCHAR(50) NOT NULL COMMENT '战法类型（B1/S1）',
  tag_id INT DEFAULT NULL COMMENT '标签ID（NULL表示全部标签）',
  tag_name VARCHAR(100) DEFAULT NULL COMMENT '标签名称',
  
  -- 计算统计
  total_stocks INT DEFAULT 0 COMMENT '总股票数',
  calculated_stocks INT DEFAULT 0 COMMENT '已计算股票数',
  matched_stocks INT DEFAULT 0 COMMENT '匹配的股票数',
  failed_stocks INT DEFAULT 0 COMMENT '计算失败的股票数',
  
  -- 执行信息
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态（pending/running/success/failed）',
  start_time TIMESTAMP NULL DEFAULT NULL COMMENT '开始时间',
  end_time TIMESTAMP NULL DEFAULT NULL COMMENT '结束时间',
  duration_seconds INT DEFAULT NULL COMMENT '执行时长（秒）',
  error_message TEXT DEFAULT NULL COMMENT '错误信息',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  KEY idx_trade_date (trade_date),
  KEY idx_status (status),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签计算日志表';

-- 4. 创建视图：最新交易日的标签汇总
CREATE OR REPLACE VIEW v_latest_stock_tags AS
SELECT 
  s.*
FROM stock_tag_summary s
WHERE s.trade_date = (SELECT MAX(trade_date) FROM stock_tag_summary)
ORDER BY s.tag_score DESC, s.matched_tags DESC;

-- 5. 创建存储过程：清理90天前的数据
DELIMITER //

CREATE PROCEDURE sp_cleanup_old_tag_data(IN days_to_keep INT)
BEGIN
  DECLARE cutoff_date DATE;
  DECLARE deleted_results INT DEFAULT 0;
  DECLARE deleted_summary INT DEFAULT 0;
  DECLARE deleted_logs INT DEFAULT 0;
  
  -- 计算截止日期
  SET cutoff_date = DATE_SUB(CURDATE(), INTERVAL days_to_keep DAY);
  
  -- 删除旧的标签结果
  DELETE FROM stock_tag_results WHERE trade_date < cutoff_date;
  SET deleted_results = ROW_COUNT();
  
  -- 删除旧的标签汇总
  DELETE FROM stock_tag_summary WHERE trade_date < cutoff_date;
  SET deleted_summary = ROW_COUNT();
  
  -- 删除旧的计算日志（保留更长时间，如180天）
  DELETE FROM stock_tag_calculation_log WHERE trade_date < DATE_SUB(CURDATE(), INTERVAL days_to_keep * 2 DAY);
  SET deleted_logs = ROW_COUNT();
  
  -- 输出清理结果
  SELECT 
    cutoff_date AS cutoff_date,
    deleted_results AS deleted_results,
    deleted_summary AS deleted_summary,
    deleted_logs AS deleted_logs,
    NOW() AS cleanup_time;
END //

DELIMITER ;

-- 6. 创建存储过程：获取股票的标签列表
DELIMITER //

CREATE PROCEDURE sp_get_stock_tags(
  IN p_ts_code VARCHAR(20),
  IN p_trade_date DATE,
  IN p_strategy_type VARCHAR(50)
)
BEGIN
  SELECT 
    r.tag_id,
    r.tag_name,
    r.tag_value,
    r.category,
    t.meaning,
    t.sort_order
  FROM stock_tag_results r
  LEFT JOIN strategy_config_tags t ON r.tag_id = t.id
  WHERE r.ts_code = p_ts_code
    AND r.trade_date = p_trade_date
    AND r.strategy_type = p_strategy_type
    AND r.tag_value = TRUE
  ORDER BY t.sort_order, r.tag_name;
END //

DELIMITER ;

-- 7. 验证表创建
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  AVG_ROW_LENGTH,
  DATA_LENGTH,
  INDEX_LENGTH,
  CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'ttssreport'
  AND TABLE_NAME IN ('stock_tag_results', 'stock_tag_summary', 'stock_tag_calculation_log')
ORDER BY TABLE_NAME;

-- 8. 显示索引信息
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS COLUMNS,
  INDEX_TYPE,
  NON_UNIQUE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'ttssreport'
  AND TABLE_NAME IN ('stock_tag_results', 'stock_tag_summary', 'stock_tag_calculation_log')
GROUP BY TABLE_NAME, INDEX_NAME, INDEX_TYPE, NON_UNIQUE
ORDER BY TABLE_NAME, INDEX_NAME;
