-- ==========================================
-- 标签项变更日志表
-- 用途：记录strategy_config_tags表的所有变更操作
-- ==========================================

USE ttssreport;

CREATE TABLE IF NOT EXISTS tag_change_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    tag_id INT NOT NULL COMMENT '标签ID(关联strategy_config_tags.id)',
    operation_type VARCHAR(20) NOT NULL COMMENT '操作类型(INSERT/UPDATE/DELETE/ENABLE/DISABLE)',
    
    -- 变更前数据
    old_value JSON COMMENT '变更前的完整数据(JSON格式)',
    
    -- 变更后数据
    new_value JSON COMMENT '变更后的完整数据(JSON格式)',
    
    -- 变更详情
    changed_fields JSON COMMENT '变更的字段列表(如: ["is_enabled", "sort_order"])',
    change_summary VARCHAR(500) COMMENT '变更摘要(如: 启用标签J值<13)',
    
    -- 操作人信息
    operator_id BIGINT COMMENT '操作人ID(关联users.id)',
    operator_name VARCHAR(50) COMMENT '操作人名称',
    operator_ip VARCHAR(50) COMMENT '操作人IP地址',
    
    -- 影响范围
    affected_signals INT DEFAULT 0 COMMENT '影响的信号数量(变更后重新计算)',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '变更时间',
    
    KEY idx_tag_id (tag_id),
    KEY idx_operation_type (operation_type),
    KEY idx_operator_id (operator_id),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签项变更日志表';

-- 创建触发器：自动记录strategy_config_tags的INSERT操作
DELIMITER //

CREATE TRIGGER trg_tag_insert_log
AFTER INSERT ON strategy_config_tags
FOR EACH ROW
BEGIN
    INSERT INTO tag_change_log (
        tag_id,
        operation_type,
        new_value,
        change_summary
    ) VALUES (
        NEW.id,
        'INSERT',
        JSON_OBJECT(
            'tag_name', NEW.tag_name,
            'tag_code', NEW.tag_code,
            'strategy_type', NEW.strategy_type,
            'category', NEW.category,
            'meaning', NEW.meaning,
            'is_enabled', NEW.is_enabled,
            'is_filter', NEW.is_filter,
            'sort_order', NEW.sort_order
        ),
        CONCAT('新增标签: ', NEW.tag_name, '(', NEW.strategy_type, ')')
    );
END//

-- 创建触发器：自动记录strategy_config_tags的UPDATE操作
CREATE TRIGGER trg_tag_update_log
AFTER UPDATE ON strategy_config_tags
FOR EACH ROW
BEGIN
    DECLARE change_desc VARCHAR(500);
    
    -- 构建变更描述
    SET change_desc = CONCAT('更新标签: ', NEW.tag_name);
    
    IF OLD.is_enabled != NEW.is_enabled THEN
        SET change_desc = CONCAT(change_desc, ', 启用状态: ', OLD.is_enabled, '→', NEW.is_enabled);
    END IF;
    
    IF OLD.is_filter != NEW.is_filter THEN
        SET change_desc = CONCAT(change_desc, ', 过滤项: ', OLD.is_filter, '→', NEW.is_filter);
    END IF;
    
    INSERT INTO tag_change_log (
        tag_id,
        operation_type,
        old_value,
        new_value,
        changed_fields,
        change_summary
    ) VALUES (
        NEW.id,
        'UPDATE',
        JSON_OBJECT(
            'tag_name', OLD.tag_name,
            'tag_code', OLD.tag_code,
            'strategy_type', OLD.strategy_type,
            'category', OLD.category,
            'meaning', OLD.meaning,
            'is_enabled', OLD.is_enabled,
            'is_filter', OLD.is_filter,
            'sort_order', OLD.sort_order
        ),
        JSON_OBJECT(
            'tag_name', NEW.tag_name,
            'tag_code', NEW.tag_code,
            'strategy_type', NEW.strategy_type,
            'category', NEW.category,
            'meaning', NEW.meaning,
            'is_enabled', NEW.is_enabled,
            'is_filter', NEW.is_filter,
            'sort_order', NEW.sort_order
        ),
        JSON_ARRAY(
            IF(OLD.tag_name != NEW.tag_name, 'tag_name', NULL),
            IF(OLD.is_enabled != NEW.is_enabled, 'is_enabled', NULL),
            IF(OLD.is_filter != NEW.is_filter, 'is_filter', NULL),
            IF(OLD.sort_order != NEW.sort_order, 'sort_order', NULL)
        ),
        change_desc
    );
END//

-- 创建触发器：自动记录strategy_config_tags的DELETE操作
CREATE TRIGGER trg_tag_delete_log
BEFORE DELETE ON strategy_config_tags
FOR EACH ROW
BEGIN
    INSERT INTO tag_change_log (
        tag_id,
        operation_type,
        old_value,
        change_summary
    ) VALUES (
        OLD.id,
        'DELETE',
        JSON_OBJECT(
            'tag_name', OLD.tag_name,
            'tag_code', OLD.tag_code,
            'strategy_type', OLD.strategy_type,
            'category', OLD.category,
            'meaning', OLD.meaning,
            'is_enabled', OLD.is_enabled,
            'is_filter', OLD.is_filter,
            'sort_order', OLD.sort_order
        ),
        CONCAT('删除标签: ', OLD.tag_name, '(', OLD.strategy_type, ')')
    );
END//

DELIMITER ;
