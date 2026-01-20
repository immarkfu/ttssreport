-- 配置标签管理模块数据库表
-- 创建日期: 2024-01-15

USE ttssreport;

-- ==================== 配置标签表 ====================
CREATE TABLE IF NOT EXISTS strategy_config_tags (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    
    -- 基本信息
    name VARCHAR(100) NOT NULL COMMENT '标签名称',
    meaning TEXT NOT NULL COMMENT '含义/业务规则描述',
    calculation_logic TEXT NOT NULL COMMENT '计算取数逻辑',
    
    -- 分类信息
    category ENUM('plus', 'minus') NOT NULL COMMENT '分类: plus=加分项, minus=减分项',
    tag_type ENUM('system', 'custom') NOT NULL DEFAULT 'custom' COMMENT '标签类型: system=系统标签, custom=自定义标签',
    strategy_type VARCHAR(50) NOT NULL COMMENT '战法类型: B1, S1等',
    
    -- 排序和状态
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序顺序，数字越小越靠前',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
    
    -- 审计信息
    created_by VARCHAR(100) DEFAULT 'system' COMMENT '创建人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 索引
    INDEX idx_strategy_type (strategy_type),
    INDEX idx_category (category),
    INDEX idx_tag_type (tag_type),
    INDEX idx_sort_order (sort_order),
    INDEX idx_is_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='战法配置标签表';

-- ==================== 配置标签操作日志表 ====================
CREATE TABLE IF NOT EXISTS strategy_config_tag_logs (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    
    -- 操作信息
    tag_id INT COMMENT '标签ID（删除操作时可能为NULL）',
    tag_name VARCHAR(100) NOT NULL COMMENT '标签名称',
    operation_type ENUM('create', 'update', 'delete', 'enable', 'disable', 'reorder') NOT NULL COMMENT '操作类型',
    
    -- 变更内容
    old_value TEXT COMMENT '变更前的值（JSON格式）',
    new_value TEXT COMMENT '变更后的值（JSON格式）',
    
    -- 操作人信息
    operated_by VARCHAR(100) NOT NULL COMMENT '操作人',
    operated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    
    -- 其他信息
    remark TEXT COMMENT '备注',
    
    -- 索引
    INDEX idx_tag_id (tag_id),
    INDEX idx_operation_type (operation_type),
    INDEX idx_operated_by (operated_by),
    INDEX idx_operated_at (operated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='配置标签操作日志表';

-- ==================== 查看表结构 ====================
SHOW CREATE TABLE strategy_config_tags;
SHOW CREATE TABLE strategy_config_tag_logs;

-- ==================== 验证表是否创建成功 ====================
SELECT 
    TABLE_NAME,
    TABLE_COMMENT,
    TABLE_ROWS
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'ttssreport' 
AND TABLE_NAME IN ('strategy_config_tags', 'strategy_config_tag_logs');
