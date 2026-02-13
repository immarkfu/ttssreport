-- ==========================================
-- 用户访问日志表
-- 用于统计UV/PV等运营数据
-- ==========================================

USE ttssreport;

CREATE TABLE IF NOT EXISTS user_access_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    user_id INT COMMENT '用户ID(NULL表示未登录)',

    -- 访问信息
    page_path VARCHAR(200) COMMENT '页面路径',
    page_title VARCHAR(100) COMMENT '页面标题',
    referer VARCHAR(500) COMMENT '来源页面',

    -- 设备信息
    user_agent TEXT COMMENT '用户代理',
    ip_address VARCHAR(50) COMMENT 'IP地址',

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '访问时间',

    KEY idx_user_id (user_id),
    KEY idx_page_path (page_path),
    KEY idx_created_at (created_at),
    KEY idx_date (DATE(created_at))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户访问日志表';
