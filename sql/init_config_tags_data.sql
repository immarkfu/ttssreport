-- 初始化少妇战法（B1/S1）配置标签数据
-- 创建日期: 2024-01-15

USE ttssreport;

-- ==================== B1战法 - 加分项（触发条件作为加分项） ====================

-- 1. 白在黄上（触发条件）
INSERT INTO strategy_config_tags (name, meaning, calculation_logic, category, tag_type, strategy_type, sort_order, is_enabled, created_by)
VALUES (
  '白在黄上',
  '知行趋势指标，日线白线在黄线上（知行趋势指标只适用于日线）',
  'EMA(EMA(CLOSE, 10), 10) > (MA(CLOSE, 140) + MA(CLOSE, 28) + MA(CLOSE, 57) + MA(CLOSE, 114)) / 4',
  'plus',
  'system',
  'B1',
  1,
  TRUE,
  'system'
);

-- 2. B1（触发条件）
INSERT INTO strategy_config_tags (name, meaning, calculation_logic, category, tag_type, strategy_type, sort_order, is_enabled, created_by)
VALUES (
  'B1',
  '日线达到B1（KDJ的J值小于13）',
  'J值≤13',
  'plus',
  'system',
  'B1',
  2,
  TRUE,
  'system'
);

-- 3. MACD＞0（触发条件）
INSERT INTO strategy_config_tags (name, meaning, calculation_logic, category, tag_type, strategy_type, sort_order, is_enabled, created_by)
VALUES (
  'MACD＞0',
  'MACD白线在0轴线上',
  'MACD_DIF > 0.5',
  'plus',
  'system',
  'B1',
  3,
  TRUE,
  'system'
);

-- 4. 红肥绿瘦
INSERT INTO strategy_config_tags (name, meaning, calculation_logic, category, tag_type, strategy_type, sort_order, is_enabled, created_by)
VALUES (
  '红肥绿瘦',
  '近期交易量健康（红肥绿瘦）',
  '最近10个交易日所有上涨的交易日的交易量＞最近的前一个或后一个下跌交易日的交易量',
  'plus',
  'system',
  'B1',
  4,
  TRUE,
  'system'
);

-- 5. 分歧后一致
INSERT INTO strategy_config_tags (name, meaning, calculation_logic, category, tag_type, strategy_type, sort_order, is_enabled, created_by)
VALUES (
  '分歧后一致',
  '分歧之后突然缩量：当天成交额较前一天有较大减少',
  '当日成交额≤前一交易日成交额*50%',
  'plus',
  'system',
  'B1',
  5,
  TRUE,
  'system'
);

-- 6. 小阴小阳
INSERT INTO strategy_config_tags (name, meaning, calculation_logic, category, tag_type, strategy_type, sort_order, is_enabled, created_by)
VALUES (
  '小阴小阳',
  '当天涨跌幅属于小阴小阳：-2%~~~+1.8%，从分歧转一致后的反转K',
  '+1.8%≥当日涨跌幅≥-2%',
  'plus',
  'system',
  'B1',
  6,
  TRUE,
  'system'
);

-- 7. 近期异动
INSERT INTO strategy_config_tags (name, meaning, calculation_logic, category, tag_type, strategy_type, sort_order, is_enabled, created_by)
VALUES (
  '近期异动',
  '近期有异动（最近的底部有过放量长阳，如果有涨停板更佳）',
  '最近 10 个交易日内存在至少 1 个交易日：①当日涨幅≥6%且成交量大于等于前一交易日成交量*1.5',
  'plus',
  'system',
  'B1',
  7,
  TRUE,
  'system'
);

-- 8. 倍量红柱
INSERT INTO strategy_config_tags (name, meaning, calculation_logic, category, tag_type, strategy_type, sort_order, is_enabled, created_by)
VALUES (
  '倍量红柱',
  '近期有倍量红柱出现',
  '最近10个交易日有至少1个交易日上涨，且当日交易量≥前1个交易日的交易量*1.8',
  'plus',
  'system',
  'B1',
  8,
  TRUE,
  'system'
);

-- 9. 金叉首秀
INSERT INTO strategy_config_tags (name, meaning, calculation_logic, category, tag_type, strategy_type, sort_order, is_enabled, created_by)
VALUES (
  '金叉首秀',
  '金叉后第一次B1：在最近一次白线从下方上穿黄线后的第一次B1',
  '# 1. 定义知行趋势指标 白线:=MA(MA(CLOSE,10),10); 黄线:=MA(CLOSE,28); 金叉:=CROSS(白线,黄线); # 2. 找最近一次金叉（回溯60日） 最近金叉:=REF(BARSLAST(金叉 AND EVERY(白线>黄线,BARSLAST(金叉))),0); T金叉:=REF(DATE,最近金叉); # 3. 合并连续超卖段（J<13） J值:=KDJ.J; 超卖始:=BARSLAST(J值>=13 AND REF(J值,1)<13 AND BARSLAST(金叉)<BARSLAST(J值>=13)); 超卖终:=BARSLAST(J值<13 AND REF(J值,1)>=13 AND BARSLAST(金叉)<BARSLAST(J值<13)); 连续超卖段:=IF(超卖终=0,FROMOPEN,超卖终-超卖始);',
  'plus',
  'system',
  'B1',
  9,
  TRUE,
  'system'
);

-- 10. 振幅适当
INSERT INTO strategy_config_tags (name, meaning, calculation_logic, category, tag_type, strategy_type, sort_order, is_enabled, created_by)
VALUES (
  '振幅适当',
  '振幅适当:600开头的股票当日振幅 4%以内&000、300、688开头的股票，当日振幅7%以内',
  '当股票代码是600开头时，当日振幅≤4%；当股票代码是000或300或688开头时，当日振幅≤7%',
  'plus',
  'system',
  'B1',
  10,
  TRUE,
  'system'
);

-- 11. 市值适当
INSERT INTO strategy_config_tags (name, meaning, calculation_logic, category, tag_type, strategy_type, sort_order, is_enabled, created_by)
VALUES (
  '市值适当',
  '市值适当：总市值等于大于80亿人民币',
  '总市值≥80亿人民币',
  'plus',
  'system',
  'B1',
  11,
  TRUE,
  'system'
);

-- ==================== B1战法 - 减分项 ====================

-- 12. 放量出货
INSERT INTO strategy_config_tags (name, meaning, calculation_logic, category, tag_type, strategy_type, sort_order, is_enabled, created_by)
VALUES (
  '放量出货',
  '近期有放量出货',
  '最近10个交易日出现过（下跌且成交量大于等于前五个交易日的成交量）',
  'minus',
  'system',
  'B1',
  1,
  TRUE,
  'system'
);

-- 13. 缩量涨停
INSERT INTO strategy_config_tags (name, meaning, calculation_logic, category, tag_type, strategy_type, sort_order, is_enabled, created_by)
VALUES (
  '缩量涨停',
  '缩量涨停（庄股，尽快离场）：最近20个交易日存在缩量涨停',
  '最近20个交易日出现过涨停且涨停日成交量小于等于前一日成交量*50%',
  'minus',
  'system',
  'B1',
  2,
  TRUE,
  'system'
);

-- ==================== S1战法 - 加分项（触发条件作为加分项） ====================

-- 14. S1（触发条件）
INSERT INTO strategy_config_tags (name, meaning, calculation_logic, category, tag_type, strategy_type, sort_order, is_enabled, created_by)
VALUES (
  'S1',
  '出现顶部大阴线',
  '当日股价下跌，成交量＞B1日开始的每一日的成交量',
  'plus',
  'system',
  'S1',
  1,
  TRUE,
  'system'
);

-- 15. 破白线（触发条件）
INSERT INTO strategy_config_tags (name, meaning, calculation_logic, category, tag_type, strategy_type, sort_order, is_enabled, created_by)
VALUES (
  '破白线',
  '跌破白线',
  '当日股价下跌，收盘价比白线低',
  'plus',
  'system',
  'S1',
  2,
  TRUE,
  'system'
);

-- 16. 破黄线（触发条件）
INSERT INTO strategy_config_tags (name, meaning, calculation_logic, category, tag_type, strategy_type, sort_order, is_enabled, created_by)
VALUES (
  '破黄线',
  '跌破黄线',
  '前一交易日日收盘价比黄线低',
  'plus',
  'system',
  'S1',
  3,
  TRUE,
  'system'
);

-- 17. 破黄线未收回（触发条件）
INSERT INTO strategy_config_tags (name, meaning, calculation_logic, category, tag_type, strategy_type, sort_order, is_enabled, created_by)
VALUES (
  '破黄线未收回',
  '跌破黄线',
  '前一交易日日破黄线，本交易日股价未能大于等于黄线',
  'plus',
  'system',
  'S1',
  4,
  TRUE,
  'system'
);

-- ==================== 验证插入结果 ====================

SELECT 
    strategy_type AS '战法类型',
    category AS '分类',
    COUNT(*) AS '标签数量'
FROM strategy_config_tags
GROUP BY strategy_type, category
ORDER BY strategy_type, category;

SELECT 
    id,
    name AS '标签名称',
    strategy_type AS '战法类型',
    category AS '分类',
    tag_type AS '标签类型',
    sort_order AS '排序',
    is_enabled AS '是否启用'
FROM strategy_config_tags
ORDER BY strategy_type, category, sort_order;
