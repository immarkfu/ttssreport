-- ==========================================
-- 战法标签配置表(新版)
-- 在原有基础上新增：is_enabled(是否启用)、is_filter(是否过滤项)
-- ==========================================

USE ttssreport;

DROP TABLE IF EXISTS strategy_config_tags;

CREATE TABLE strategy_config_tags (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    user_id INT DEFAULT NULL COMMENT '用户ID(NULL表示系统默认/管理员配置)',
    tag_name VARCHAR(100) NOT NULL COMMENT '标签名称(如：J值<13)',
    tag_code VARCHAR(50) NOT NULL COMMENT '标签代码(如：j_lt_13)',
    strategy_type VARCHAR(50) NOT NULL COMMENT '战法类型(B1/S1)',
    category VARCHAR(20) NOT NULL COMMENT '分类(plus=加分项，minus=减分项)',
    meaning VARCHAR(200) COMMENT '含义说明',

    is_enabled TINYINT DEFAULT 1 COMMENT '是否启用(1=启用，0=禁用)',
    is_filter TINYINT DEFAULT 0 COMMENT '是否过滤项(1=是，0=否。过滤项不满足则直接排除)',
    threshold_value DECIMAL(10,2) DEFAULT NULL COMMENT '阈值(过滤项专用，如J值阈值13，MACD_DIF阈值0)',

    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    KEY idx_user_id (user_id),
    KEY idx_strategy_type (strategy_type),
    KEY idx_category (category),
    KEY idx_is_enabled (is_enabled),
    KEY idx_is_filter (is_filter),
    KEY idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='战法标签配置表(新版)';

-- 插入B1战法标签配置(管理员配置，user_id=1)
INSERT INTO strategy_config_tags (user_id, tag_name, tag_code, strategy_type, category, meaning, is_enabled, is_filter, threshold_value, sort_order) VALUES
-- B1核心过滤项(必须满足，使用前复权数据)
(1, 'J值<13', 'j_lt_13_qfq', 'B1', 'plus', 'KDJ的J值(前复权)低于阈值，超卖信号', 1, 1, 13.00, 1),
(1, 'MACD>0', 'macd_dif_gt_0_qfq', 'B1', 'plus', 'MACD-DIF(前复权)大于阈值，多头趋势', 1, 1, 0.00, 2),

-- B1加分项(9个，up1-up9)
(1, '红肥绿瘦', 'up1', 'B1', 'plus', '最近10日所有上涨日交易量都大于相邻下跌日', 1, 0, NULL, 3),
(1, '分歧缩量', 'up2', 'B1', 'plus', '当日成交额<=前一日*50%', 1, 0, NULL, 4),
(1, '小阴小阳', 'up3', 'B1', 'plus', '当天涨跌幅在-2%到1.8%之间', 1, 0, NULL, 5),
(1, '近期异动', 'up4', 'B1', 'plus', '最近10日存在涨幅>=6%且成交量>=前一日*1.5', 1, 0, NULL, 6),
(1, '倍量红柱', 'up5', 'B1', 'plus', '最近10日存在上涨日且成交量>=前一日*1.8', 1, 0, NULL, 7),
(1, '振幅适当', 'up6', 'B1', 'plus', '600开头振幅<=4%，000/300/688开头振幅<=7%', 1, 0, NULL, 8),
(1, '市值适当', 'up7', 'B1', 'plus', '总市值>=80亿', 1, 0, NULL, 9),
(1, '白在黄上', 'up8', 'B1', 'plus', 'MA5在MA10上方（暂不启用）', 0, 0, NULL, 10),
(1, '金叉首秀', 'up9', 'B1', 'plus', 'MACD金叉首次出现（暂不启用）', 0, 0, NULL, 11),

-- B1减分项(4个，down1-down4)
(1, '下跌放量', 'down1', 'B1', 'minus', '最近10日出现下跌且成交量>=前5日最大成交量', 1, 0, NULL, 101),
(1, '涨停缩量', 'down2', 'B1', 'minus', '最近20日出现涨停且涨停日成交量<=前一日*50%', 1, 0, NULL, 102),
(1, '蜈蚣出没', 'down3', 'B1', 'minus', '出现蜈蚣K线形态（暂不启用）', 0, 0, NULL, 103),
(1, '底部跳空', 'down4', 'B1', 'minus', '底部跳空缺口（暂不启用）', 0, 0, NULL, 104);

-- 插入S1战法标签配置(管理员配置，user_id=1)
INSERT INTO strategy_config_tags (user_id, tag_name, tag_code, strategy_type, category, meaning, is_enabled, is_filter, threshold_value, sort_order) VALUES
-- S1核心过滤项(必须满足)
(1, 'J值>80', 'j_gt_80', 'S1', 'plus', 'KDJ的J值高于阈值，超买信号', 1, 1, 80.00, 1),

-- S1加分项(可选)
(1, '跌破白线', 'break_white_line', 'S1', 'plus', '跌破关键均线(白线)', 1, 0, NULL, 2),
(1, '长阳放飞', 'long_yang_fly', 'S1', 'plus', '长阳线后快速回落', 1, 0, NULL, 3),
(1, '放量', 'high_volume', 'S1', 'plus', '放量下跌', 1, 0, NULL, 4),
(1, 'K值>75', 'k_gt_75', 'S1', 'plus', 'KDJ的K值高于75', 1, 0, NULL, 5),
(1, 'D值>70', 'd_gt_70', 'S1', 'plus', 'KDJ的D值高于70', 1, 0, NULL, 6),
(1, '高位放量', 'high_position_vol', 'S1', 'plus', '高位放量有风险', 1, 0, NULL, 7),
(1, '顶部背离', 'top_divergence', 'S1', 'plus', '价格创新高但指标不创新高', 1, 0, NULL, 8),
(1, 'MACD<0', 'macd_lt_0', 'S1', 'plus', 'MACD柱小于0，空头趋势', 1, 0, NULL, 9),

-- S1减分项
(1, '底部区域', 'bottom_area', 'S1', 'minus', '处于底部区域', 1, 0, NULL, 101),
(1, '缩量下跌', 'shrink_vol', 'S1', 'minus', '缩量下跌可能企稳', 1, 0, NULL, 102);

-- ==========================================
-- 已存在表的升级脚本（仅执行一次）
-- ==========================================
-- ALTER TABLE strategy_config_tags ADD COLUMN user_id INT DEFAULT NULL COMMENT '用户ID' AFTER id;
-- ALTER TABLE strategy_config_tags ADD INDEX idx_user_id (user_id);
-- UPDATE strategy_config_tags SET user_id = 1 WHERE user_id IS NULL;
-- ALTER TABLE strategy_config_tags ADD COLUMN threshold_value DECIMAL(10,2) DEFAULT NULL COMMENT '阈值' AFTER is_filter;
-- UPDATE strategy_config_tags SET threshold_value = 13.00 WHERE tag_code = 'j_lt_13_qfq';
-- UPDATE strategy_config_tags SET threshold_value = 0.00 WHERE tag_code = 'macd_dif_gt_0_qfq';
-- UPDATE strategy_config_tags SET threshold_value = 80.00 WHERE tag_code = 'j_gt_80';
