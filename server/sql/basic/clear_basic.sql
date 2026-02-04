-- ==========================================
-- 备用行情基础数据表
-- 数据来源：Tushare bak_daily接口
-- 用途：作为B1/S1信号计算的基础数据
-- 注意：open/high/low/close/change为MySQL关键字，使用反引号转义
-- ==========================================

USE ttssreport;
DROP TABLE IF EXISTS bak_daily_data;

CREATE TABLE IF NOT EXISTS bak_daily_data (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    ts_code VARCHAR(20) NOT NULL COMMENT 'TS股票代码',
    trade_date VARCHAR(8) NOT NULL COMMENT '交易日期(YYYYMMDD)',
    name VARCHAR(50) COMMENT '股票名称',

    -- 价格数据
    `open` DECIMAL(15, 4) COMMENT '开盘价',
    `high` DECIMAL(15, 4) COMMENT '最高价',
    `low` DECIMAL(15, 4) COMMENT '最低价',
    `close` DECIMAL(15, 4) COMMENT '收盘价',
    pre_close DECIMAL(15, 4) COMMENT '昨收价',
    `change` DECIMAL(15, 4) COMMENT '涨跌额',
    pct_change DECIMAL(10, 4) COMMENT '涨跌幅(%)',

    -- 成交数据
    vol BIGINT COMMENT '成交量(手)',
    amount DECIMAL(20, 2) COMMENT '成交额(千元)',
    selling BIGINT COMMENT '内盘-主动卖(手)',
    buying BIGINT COMMENT '外盘-主动买(手)',

    -- 技术指标
    vol_ratio DECIMAL(10, 4) COMMENT '量比',
    turn_over DECIMAL(10, 4) COMMENT '换手率(%)',
    swing DECIMAL(10, 4) COMMENT '振幅(%)',
    avg_price DECIMAL(15, 4) COMMENT '平均价',

    -- 估值数据
    pe DECIMAL(15, 4) COMMENT '市盈率(动)',
    total_share DECIMAL(15, 4) COMMENT '总股本(亿)',
    float_share DECIMAL(15, 4) COMMENT '流通股本(亿)',
    total_mv DECIMAL(20, 2) COMMENT '总市值(万元)',
    float_mv DECIMAL(20, 2) COMMENT '流通市值(万元)',

    -- 分类信息
    industry VARCHAR(50) COMMENT '所属行业',
    area VARCHAR(50) COMMENT '所属地域',

    -- 特色指标
    strength DECIMAL(10, 4) COMMENT '强弱度(%)',
    activity DECIMAL(10, 4) COMMENT '活跃度(%)',
    avg_turnover DECIMAL(10, 4) COMMENT '笔换手',
    attack DECIMAL(10, 4) COMMENT '攻击波(%)',
    interval_3 DECIMAL(10, 4) COMMENT '近3月涨幅(%)',
    interval_6 DECIMAL(10, 4) COMMENT '近6月涨幅(%)',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    UNIQUE KEY uk_ts_code_trade_date (ts_code, trade_date),
    KEY idx_trade_date (trade_date),
    KEY idx_ts_code (ts_code),
    KEY idx_industry (industry),
    KEY idx_pct_change (pct_change),
    KEY idx_vol_ratio (vol_ratio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='备用行情基础数据表';

-- ==========================================
-- 股票技术面因子基础数据表
-- 数据来源：Tushare stk_factor_pro接口
-- 用途：作为B1/S1信号计算的技术指标数据
-- 字段与Tushare接口一一对应，完整覆盖所有输出参数
-- 注意：open/close/high/low/change为MySQL关键字，使用反引号转义
-- ==========================================

USE ttssreport;

DROP TABLE IF EXISTS stk_factor_pro_data;

CREATE TABLE IF NOT EXISTS stk_factor_pro_data (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    ts_code VARCHAR(20) NOT NULL COMMENT 'TS股票代码',
    trade_date VARCHAR(8) NOT NULL COMMENT '交易日期(YYYYMMDD)',

    -- 基础价格字段(不复权)
    `open` DECIMAL(15, 4) COMMENT '开盘价',
    `high` DECIMAL(15, 4) COMMENT '最高价',
    `low` DECIMAL(15, 4) COMMENT '最低价',
    `close` DECIMAL(15, 4) COMMENT '收盘价',
    pre_close DECIMAL(15, 4) COMMENT '昨收价(前复权)',

    -- 基础价格字段(后复权)
    open_hfq DECIMAL(15, 4) COMMENT '开盘价(后复权)',
    high_hfq DECIMAL(15, 4) COMMENT '最高价(后复权)',
    low_hfq DECIMAL(15, 4) COMMENT '最低价(后复权)',
    close_hfq DECIMAL(15, 4) COMMENT '收盘价(后复权)',

    -- 基础价格字段(前复权)
    open_qfq DECIMAL(15, 4) COMMENT '开盘价(前复权)',
    high_qfq DECIMAL(15, 4) COMMENT '最高价(前复权)',
    low_qfq DECIMAL(15, 4) COMMENT '最低价(前复权)',
    close_qfq DECIMAL(15, 4) COMMENT '收盘价(前复权)',

    -- 成交数据
    `change` DECIMAL(15, 4) COMMENT '涨跌额',
    pct_chg DECIMAL(10, 4) COMMENT '涨跌幅(%)',
    vol BIGINT COMMENT '成交量(手)',
    amount DECIMAL(20, 2) COMMENT '成交额(千元)',
    turnover_rate DECIMAL(10, 4) COMMENT '换手率(%)',
    turnover_rate_f DECIMAL(10, 4) COMMENT '换手率(自由流通股)(%)',
    volume_ratio DECIMAL(10, 4) COMMENT '量比',

    -- 估值指标
    pe DECIMAL(15, 4) COMMENT '市盈率',
    pe_ttm DECIMAL(15, 4) COMMENT '市盈率(TTM)',
    pb DECIMAL(15, 4) COMMENT '市净率',
    ps DECIMAL(15, 4) COMMENT '市销率',
    ps_ttm DECIMAL(15, 4) COMMENT '市销率(TTM)',
    dv_ratio DECIMAL(10, 4) COMMENT '股息率(%)',
    dv_ttm DECIMAL(10, 4) COMMENT '股息率(TTM)(%)',

    -- 股本数据
    total_share DECIMAL(15, 2) COMMENT '总股本(万股)',
    float_share DECIMAL(15, 2) COMMENT '流通股本(万股)',
    free_share DECIMAL(15, 2) COMMENT '自由流通股本(万)',
    total_mv DECIMAL(20, 2) COMMENT '总市值(万元)',
    circ_mv DECIMAL(20, 2) COMMENT '流通市值(万元)',
    adj_factor DECIMAL(15, 6) COMMENT '复权因子',

    -- 技术因子 - ASI(振动升降指标)
    asi_bfq DECIMAL(15, 4) COMMENT 'ASI指标(不复权)',
    asi_hfq DECIMAL(15, 4) COMMENT 'ASI指标(后复权)',
    asi_qfq DECIMAL(15, 4) COMMENT 'ASI指标(前复权)',
    asit_bfq DECIMAL(15, 4) COMMENT 'ASIT指标(不复权)',
    asit_hfq DECIMAL(15, 4) COMMENT 'ASIT指标(后复权)',
    asit_qfq DECIMAL(15, 4) COMMENT 'ASIT指标(前复权)',

    -- 技术因子 - ATR(真实波动N日平均值)
    atr_bfq DECIMAL(15, 4) COMMENT 'ATR指标(不复权)',
    atr_hfq DECIMAL(15, 4) COMMENT 'ATR指标(后复权)',
    atr_qfq DECIMAL(15, 4) COMMENT 'ATR指标(前复权)',

    -- 技术因子 - BBI(多空指标)
    bbi_bfq DECIMAL(15, 4) COMMENT 'BBI指标(不复权)',
    bbi_hfq DECIMAL(15, 4) COMMENT 'BBI指标(后复权)',
    bbi_qfq DECIMAL(15, 4) COMMENT 'BBI指标(前复权)',

    -- 技术因子 - BIAS(乖离率)
    bias1_bfq DECIMAL(15, 4) COMMENT 'BIAS1指标(不复权)',
    bias1_hfq DECIMAL(15, 4) COMMENT 'BIAS1指标(后复权)',
    bias1_qfq DECIMAL(15, 4) COMMENT 'BIAS1指标(前复权)',
    bias2_bfq DECIMAL(15, 4) COMMENT 'BIAS2指标(不复权)',
    bias2_hfq DECIMAL(15, 4) COMMENT 'BIAS2指标(后复权)',
    bias2_qfq DECIMAL(15, 4) COMMENT 'BIAS2指标(前复权)',
    bias3_bfq DECIMAL(15, 4) COMMENT 'BIAS3指标(不复权)',
    bias3_hfq DECIMAL(15, 4) COMMENT 'BIAS3指标(后复权)',
    bias3_qfq DECIMAL(15, 4) COMMENT 'BIAS3指标(前复权)',

    -- 技术因子 - BOLL(布林带)
    boll_lower_bfq DECIMAL(15, 4) COMMENT 'BOLL下轨(不复权)',
    boll_lower_hfq DECIMAL(15, 4) COMMENT 'BOLL下轨(后复权)',
    boll_lower_qfq DECIMAL(15, 4) COMMENT 'BOLL下轨(前复权)',
    boll_mid_bfq DECIMAL(15, 4) COMMENT 'BOLL中轨(不复权)',
    boll_mid_hfq DECIMAL(15, 4) COMMENT 'BOLL中轨(后复权)',
    boll_mid_qfq DECIMAL(15, 4) COMMENT 'BOLL中轨(前复权)',
    boll_upper_bfq DECIMAL(15, 4) COMMENT 'BOLL上轨(不复权)',
    boll_upper_hfq DECIMAL(15, 4) COMMENT 'BOLL上轨(后复权)',
    boll_upper_qfq DECIMAL(15, 4) COMMENT 'BOLL上轨(前复权)',

    -- 技术因子 - BRAR(情绪指标)
    brar_ar_bfq DECIMAL(15, 4) COMMENT 'BRAR-AR指标(不复权)',
    brar_ar_hfq DECIMAL(15, 4) COMMENT 'BRAR-AR指标(后复权)',
    brar_ar_qfq DECIMAL(15, 4) COMMENT 'BRAR-AR指标(前复权)',
    brar_br_bfq DECIMAL(15, 4) COMMENT 'BRAR-BR指标(不复权)',
    brar_br_hfq DECIMAL(15, 4) COMMENT 'BRAR-BR指标(后复权)',
    brar_br_qfq DECIMAL(15, 4) COMMENT 'BRAR-BR指标(前复权)',

    -- 技术因子 - CCI(顺势指标)
    cci_bfq DECIMAL(15, 4) COMMENT 'CCI指标(不复权)',
    cci_hfq DECIMAL(15, 4) COMMENT 'CCI指标(后复权)',
    cci_qfq DECIMAL(15, 4) COMMENT 'CCI指标(前复权)',

    -- 技术因子 - CR(价格动量指标)
    cr_bfq DECIMAL(15, 4) COMMENT 'CR指标(不复权)',
    cr_hfq DECIMAL(15, 4) COMMENT 'CR指标(后复权)',
    cr_qfq DECIMAL(15, 4) COMMENT 'CR指标(前复权)',

    -- 技术因子 - DFMA(平行线差指标)
    dfma_dif_bfq DECIMAL(15, 4) COMMENT 'DFMA-DIF指标(不复权)',
    dfma_dif_hfq DECIMAL(15, 4) COMMENT 'DFMA-DIF指标(后复权)',
    dfma_dif_qfq DECIMAL(15, 4) COMMENT 'DFMA-DIF指标(前复权)',
    dfma_difma_bfq DECIMAL(15, 4) COMMENT 'DFMA-DIFMA指标(不复权)',
    dfma_difma_hfq DECIMAL(15, 4) COMMENT 'DFMA-DIFMA指标(后复权)',
    dfma_difma_qfq DECIMAL(15, 4) COMMENT 'DFMA-DIFMA指标(前复权)',

    -- 技术因子 - DMI(动向指标)
    dmi_adx_bfq DECIMAL(15, 4) COMMENT 'DMI-ADX指标(不复权)',
    dmi_adx_hfq DECIMAL(15, 4) COMMENT 'DMI-ADX指标(后复权)',
    dmi_adx_qfq DECIMAL(15, 4) COMMENT 'DMI-ADX指标(前复权)',
    dmi_adxr_bfq DECIMAL(15, 4) COMMENT 'DMI-ADXR指标(不复权)',
    dmi_adxr_hfq DECIMAL(15, 4) COMMENT 'DMI-ADXR指标(后复权)',
    dmi_adxr_qfq DECIMAL(15, 4) COMMENT 'DMI-ADXR指标(前复权)',
    dmi_mdi_bfq DECIMAL(15, 4) COMMENT 'DMI-MDI指标(不复权)',
    dmi_mdi_hfq DECIMAL(15, 4) COMMENT 'DMI-MDI指标(后复权)',
    dmi_mdi_qfq DECIMAL(15, 4) COMMENT 'DMI-MDI指标(前复权)',
    dmi_pdi_bfq DECIMAL(15, 4) COMMENT 'DMI-PDI指标(不复权)',
    dmi_pdi_hfq DECIMAL(15, 4) COMMENT 'DMI-PDI指标(后复权)',
    dmi_pdi_qfq DECIMAL(15, 4) COMMENT 'DMI-PDI指标(前复权)',

    -- 连续涨跌天数
    downdays INT COMMENT '连跌天数',
    updays INT COMMENT '连涨天数',

    -- 技术因子 - DPO(区间震荡线)
    dpo_bfq DECIMAL(15, 4) COMMENT 'DPO指标(不复权)',
    dpo_hfq DECIMAL(15, 4) COMMENT 'DPO指标(后复权)',
    dpo_qfq DECIMAL(15, 4) COMMENT 'DPO指标(前复权)',
    madpo_bfq DECIMAL(15, 4) COMMENT 'MADPO指标(不复权)',
    madpo_hfq DECIMAL(15, 4) COMMENT 'MADPO指标(后复权)',
    madpo_qfq DECIMAL(15, 4) COMMENT 'MADPO指标(前复权)',

    -- 技术因子 - EMA(指数移动平均)
    ema_bfq_5 DECIMAL(15, 4) COMMENT 'EMA5(不复权)',
    ema_bfq_10 DECIMAL(15, 4) COMMENT 'EMA10(不复权)',
    ema_bfq_20 DECIMAL(15, 4) COMMENT 'EMA20(不复权)',
    ema_bfq_30 DECIMAL(15, 4) COMMENT 'EMA30(不复权)',
    ema_bfq_60 DECIMAL(15, 4) COMMENT 'EMA60(不复权)',
    ema_bfq_90 DECIMAL(15, 4) COMMENT 'EMA90(不复权)',
    ema_bfq_250 DECIMAL(15, 4) COMMENT 'EMA250(不复权)',
    ema_hfq_5 DECIMAL(15, 4) COMMENT 'EMA5(后复权)',
    ema_hfq_10 DECIMAL(15, 4) COMMENT 'EMA10(后复权)',
    ema_hfq_20 DECIMAL(15, 4) COMMENT 'EMA20(后复权)',
    ema_hfq_30 DECIMAL(15, 4) COMMENT 'EMA30(后复权)',
    ema_hfq_60 DECIMAL(15, 4) COMMENT 'EMA60(后复权)',
    ema_hfq_90 DECIMAL(15, 4) COMMENT 'EMA90(后复权)',
    ema_hfq_250 DECIMAL(15, 4) COMMENT 'EMA250(后复权)',
    ema_qfq_5 DECIMAL(15, 4) COMMENT 'EMA5(前复权)',
    ema_qfq_10 DECIMAL(15, 4) COMMENT 'EMA10(前复权)',
    ema_qfq_20 DECIMAL(15, 4) COMMENT 'EMA20(前复权)',
    ema_qfq_30 DECIMAL(15, 4) COMMENT 'EMA30(前复权)',
    ema_qfq_60 DECIMAL(15, 4) COMMENT 'EMA60(前复权)',
    ema_qfq_90 DECIMAL(15, 4) COMMENT 'EMA90(前复权)',
    ema_qfq_250 DECIMAL(15, 4) COMMENT 'EMA250(前复权)',

    -- 技术因子 - EMV(简易波动指标)
    emv_bfq DECIMAL(15, 4) COMMENT 'EMV指标(不复权)',
    emv_hfq DECIMAL(15, 4) COMMENT 'EMV指标(后复权)',
    emv_qfq DECIMAL(15, 4) COMMENT 'EMV指标(前复权)',
    maemv_bfq DECIMAL(15, 4) COMMENT 'MAEMV指标(不复权)',
    maemv_hfq DECIMAL(15, 4) COMMENT 'MAEMV指标(后复权)',
    maemv_qfq DECIMAL(15, 4) COMMENT 'MAEMV指标(前复权)',

    -- 技术因子 - EXPMA(EMA指数平均数指标)
    expma_12_bfq DECIMAL(15, 4) COMMENT 'EXPMA12(不复权)',
    expma_12_hfq DECIMAL(15, 4) COMMENT 'EXPMA12(后复权)',
    expma_12_qfq DECIMAL(15, 4) COMMENT 'EXPMA12(前复权)',
    expma_50_bfq DECIMAL(15, 4) COMMENT 'EXPMA50(不复权)',
    expma_50_hfq DECIMAL(15, 4) COMMENT 'EXPMA50(后复权)',
    expma_50_qfq DECIMAL(15, 4) COMMENT 'EXPMA50(前复权)',

    -- 技术因子 - KDJ(随机指标)
    kdj_k_bfq DECIMAL(15, 4) COMMENT 'KDJ-K值(不复权)',
    kdj_k_hfq DECIMAL(15, 4) COMMENT 'KDJ-K值(后复权)',
    kdj_k_qfq DECIMAL(15, 4) COMMENT 'KDJ-K值(前复权)',
    kdj_d_bfq DECIMAL(15, 4) COMMENT 'KDJ-D值(不复权)',
    kdj_d_hfq DECIMAL(15, 4) COMMENT 'KDJ-D值(后复权)',
    kdj_d_qfq DECIMAL(15, 4) COMMENT 'KDJ-D值(前复权)',
    kdj_bfq DECIMAL(15, 4) COMMENT 'KDJ-J值(不复权)',
    kdj_hfq DECIMAL(15, 4) COMMENT 'KDJ-J值(后复权)',
    kdj_qfq DECIMAL(15, 4) COMMENT 'KDJ-J值(前复权)',

    -- 技术因子 - KTN(肯特纳交易通道)
    ktn_upper_bfq DECIMAL(15, 4) COMMENT 'KTN上轨(不复权)',
    ktn_upper_hfq DECIMAL(15, 4) COMMENT 'KTN上轨(后复权)',
    ktn_upper_qfq DECIMAL(15, 4) COMMENT 'KTN上轨(前复权)',
    ktn_mid_bfq DECIMAL(15, 4) COMMENT 'KTN中轨(不复权)',
    ktn_mid_hfq DECIMAL(15, 4) COMMENT 'KTN中轨(后复权)',
    ktn_mid_qfq DECIMAL(15, 4) COMMENT 'KTN中轨(前复权)',
    ktn_down_bfq DECIMAL(15, 4) COMMENT 'KTN下轨(不复权)',
    ktn_down_hfq DECIMAL(15, 4) COMMENT 'KTN下轨(后复权)',
    ktn_down_qfq DECIMAL(15, 4) COMMENT 'KTN下轨(前复权)',

    -- 低高日期
    lowdays INT COMMENT '当前最低价是近多少周期内最低价的最小值',
    topdays INT COMMENT '当前最高价是近多少周期内最高价的最大值',

    -- 技术因子 - MA(简单移动平均)
    ma_bfq_5 DECIMAL(15, 4) COMMENT 'MA5(不复权)',
    ma_bfq_10 DECIMAL(15, 4) COMMENT 'MA10(不复权)',
    ma_bfq_20 DECIMAL(15, 4) COMMENT 'MA20(不复权)',
    ma_bfq_30 DECIMAL(15, 4) COMMENT 'MA30(不复权)',
    ma_bfq_60 DECIMAL(15, 4) COMMENT 'MA60(不复权)',
    ma_bfq_90 DECIMAL(15, 4) COMMENT 'MA90(不复权)',
    ma_bfq_250 DECIMAL(15, 4) COMMENT 'MA250(不复权)',
    ma_hfq_5 DECIMAL(15, 4) COMMENT 'MA5(后复权)',
    ma_hfq_10 DECIMAL(15, 4) COMMENT 'MA10(后复权)',
    ma_hfq_20 DECIMAL(15, 4) COMMENT 'MA20(后复权)',
    ma_hfq_30 DECIMAL(15, 4) COMMENT 'MA30(后复权)',
    ma_hfq_60 DECIMAL(15, 4) COMMENT 'MA60(后复权)',
    ma_hfq_90 DECIMAL(15, 4) COMMENT 'MA90(后复权)',
    ma_hfq_250 DECIMAL(15, 4) COMMENT 'MA250(后复权)',
    ma_qfq_5 DECIMAL(15, 4) COMMENT 'MA5(前复权)',
    ma_qfq_10 DECIMAL(15, 4) COMMENT 'MA10(前复权)',
    ma_qfq_20 DECIMAL(15, 4) COMMENT 'MA20(前复权)',
    ma_qfq_30 DECIMAL(15, 4) COMMENT 'MA30(前复权)',
    ma_qfq_60 DECIMAL(15, 4) COMMENT 'MA60(前复权)',
    ma_qfq_90 DECIMAL(15, 4) COMMENT 'MA90(前复权)',
    ma_qfq_250 DECIMAL(15, 4) COMMENT 'MA250(前复权)',

    -- 技术因子 - MACD(指数平滑异同移动平均线)
    macd_dif_bfq DECIMAL(15, 4) COMMENT 'MACD-DIF(不复权)',
    macd_dif_hfq DECIMAL(15, 4) COMMENT 'MACD-DIF(后复权)',
    macd_dif_qfq DECIMAL(15, 4) COMMENT 'MACD-DIF(前复权)',
    macd_dea_bfq DECIMAL(15, 4) COMMENT 'MACD-DEA(不复权)',
    macd_dea_hfq DECIMAL(15, 4) COMMENT 'MACD-DEA(后复权)',
    macd_dea_qfq DECIMAL(15, 4) COMMENT 'MACD-DEA(前复权)',
    macd_bfq DECIMAL(15, 4) COMMENT 'MACD柱(不复权)',
    macd_hfq DECIMAL(15, 4) COMMENT 'MACD柱(后复权)',
    macd_qfq DECIMAL(15, 4) COMMENT 'MACD柱(前复权)',

    -- 技术因子 - MASS(梅斯线)
    mass_bfq DECIMAL(15, 4) COMMENT 'MASS指标(不复权)',
    mass_hfq DECIMAL(15, 4) COMMENT 'MASS指标(后复权)',
    mass_qfq DECIMAL(15, 4) COMMENT 'MASS指标(前复权)',
    ma_mass_bfq DECIMAL(15, 4) COMMENT 'MA_MASS指标(不复权)',
    ma_mass_hfq DECIMAL(15, 4) COMMENT 'MA_MASS指标(后复权)',
    ma_mass_qfq DECIMAL(15, 4) COMMENT 'MA_MASS指标(前复权)',

    -- 技术因子 - MFI(资金流量指标)
    mfi_bfq DECIMAL(15, 4) COMMENT 'MFI指标(不复权)',
    mfi_hfq DECIMAL(15, 4) COMMENT 'MFI指标(后复权)',
    mfi_qfq DECIMAL(15, 4) COMMENT 'MFI指标(前复权)',

    -- 技术因子 - MTM(动量指标)
    mtm_bfq DECIMAL(15, 4) COMMENT 'MTM指标(不复权)',
    mtm_hfq DECIMAL(15, 4) COMMENT 'MTM指标(后复权)',
    mtm_qfq DECIMAL(15, 4) COMMENT 'MTM指标(前复权)',
    mtmma_bfq DECIMAL(15, 4) COMMENT 'MTMMA指标(不复权)',
    mtmma_hfq DECIMAL(15, 4) COMMENT 'MTMMA指标(后复权)',
    mtmma_qfq DECIMAL(15, 4) COMMENT 'MTMMA指标(前复权)',

    -- 技术因子 - OBV(能量潮指标)
    obv_bfq DECIMAL(15, 4) COMMENT 'OBV指标(不复权)',
    obv_hfq DECIMAL(15, 4) COMMENT 'OBV指标(后复权)',
    obv_qfq DECIMAL(15, 4) COMMENT 'OBV指标(前复权)',

    -- 技术因子 - PSY(心理线指标)
    psy_bfq DECIMAL(15, 4) COMMENT 'PSY指标(不复权)',
    psy_hfq DECIMAL(15, 4) COMMENT 'PSY指标(后复权)',
    psy_qfq DECIMAL(15, 4) COMMENT 'PSY指标(前复权)',
    psyma_bfq DECIMAL(15, 4) COMMENT 'PSYMA指标(不复权)',
    psyma_hfq DECIMAL(15, 4) COMMENT 'PSYMA指标(后复权)',
    psyma_qfq DECIMAL(15, 4) COMMENT 'PSYMA指标(前复权)',

    -- 技术因子 - ROC(变动率指标)
    roc_bfq DECIMAL(15, 4) COMMENT 'ROC指标(不复权)',
    roc_hfq DECIMAL(15, 4) COMMENT 'ROC指标(后复权)',
    roc_qfq DECIMAL(15, 4) COMMENT 'ROC指标(前复权)',
    maroc_bfq DECIMAL(15, 4) COMMENT 'MAROC指标(不复权)',
    maroc_hfq DECIMAL(15, 4) COMMENT 'MAROC指标(后复权)',
    maroc_qfq DECIMAL(15, 4) COMMENT 'MAROC指标(前复权)',

    -- 技术因子 - RSI(相对强弱指标)
    rsi_bfq_6 DECIMAL(15, 4) COMMENT 'RSI6(不复权)',
    rsi_bfq_12 DECIMAL(15, 4) COMMENT 'RSI12(不复权)',
    rsi_bfq_24 DECIMAL(15, 4) COMMENT 'RSI24(不复权)',
    rsi_hfq_6 DECIMAL(15, 4) COMMENT 'RSI6(后复权)',
    rsi_hfq_12 DECIMAL(15, 4) COMMENT 'RSI12(后复权)',
    rsi_hfq_24 DECIMAL(15, 4) COMMENT 'RSI24(后复权)',
    rsi_qfq_6 DECIMAL(15, 4) COMMENT 'RSI6(前复权)',
    rsi_qfq_12 DECIMAL(15, 4) COMMENT 'RSI12(前复权)',
    rsi_qfq_24 DECIMAL(15, 4) COMMENT 'RSI24(前复权)',

    -- 技术因子 - TAQ(唐安奇通道-海龟交易指标)
    taq_up_bfq DECIMAL(15, 4) COMMENT 'TAQ上轨(不复权)',
    taq_up_hfq DECIMAL(15, 4) COMMENT 'TAQ上轨(后复权)',
    taq_up_qfq DECIMAL(15, 4) COMMENT 'TAQ上轨(前复权)',
    taq_mid_bfq DECIMAL(15, 4) COMMENT 'TAQ中轨(不复权)',
    taq_mid_hfq DECIMAL(15, 4) COMMENT 'TAQ中轨(后复权)',
    taq_mid_qfq DECIMAL(15, 4) COMMENT 'TAQ中轨(前复权)',
    taq_down_bfq DECIMAL(15, 4) COMMENT 'TAQ下轨(不复权)',
    taq_down_hfq DECIMAL(15, 4) COMMENT 'TAQ下轨(后复权)',
    taq_down_qfq DECIMAL(15, 4) COMMENT 'TAQ下轨(前复权)',

    -- 技术因子 - TRIX(三重指数平滑平均线)
    trix_bfq DECIMAL(15, 4) COMMENT 'TRIX指标(不复权)',
    trix_hfq DECIMAL(15, 4) COMMENT 'TRIX指标(后复权)',
    trix_qfq DECIMAL(15, 4) COMMENT 'TRIX指标(前复权)',
    trma_bfq DECIMAL(15, 4) COMMENT 'TRMA指标(不复权)',
    trma_hfq DECIMAL(15, 4) COMMENT 'TRMA指标(后复权)',
    trma_qfq DECIMAL(15, 4) COMMENT 'TRMA指标(前复权)',

    -- 技术因子 - VR(容量比率)
    vr_bfq DECIMAL(15, 4) COMMENT 'VR指标(不复权)',
    vr_hfq DECIMAL(15, 4) COMMENT 'VR指标(后复权)',
    vr_qfq DECIMAL(15, 4) COMMENT 'VR指标(前复权)',

    -- 技术因子 - WR(威廉指标)
    wr_bfq DECIMAL(15, 4) COMMENT 'WR指标(不复权)',
    wr_hfq DECIMAL(15, 4) COMMENT 'WR指标(后复权)',
    wr_qfq DECIMAL(15, 4) COMMENT 'WR指标(前复权)',
    wr1_bfq DECIMAL(15, 4) COMMENT 'WR1指标(不复权)',
    wr1_hfq DECIMAL(15, 4) COMMENT 'WR1指标(后复权)',
    wr1_qfq DECIMAL(15, 4) COMMENT 'WR1指标(前复权)',

    -- 技术因子 - XSII(薛斯通道II)
    xsii_td1_bfq DECIMAL(15, 4) COMMENT 'XSII-TD1(不复权)',
    xsii_td1_hfq DECIMAL(15, 4) COMMENT 'XSII-TD1(后复权)',
    xsii_td1_qfq DECIMAL(15, 4) COMMENT 'XSII-TD1(前复权)',
    xsii_td2_bfq DECIMAL(15, 4) COMMENT 'XSII-TD2(不复权)',
    xsii_td2_hfq DECIMAL(15, 4) COMMENT 'XSII-TD2(后复权)',
    xsii_td2_qfq DECIMAL(15, 4) COMMENT 'XSII-TD2(前复权)',
    xsii_td3_bfq DECIMAL(15, 4) COMMENT 'XSII-TD3(不复权)',
    xsii_td3_hfq DECIMAL(15, 4) COMMENT 'XSII-TD3(后复权)',
    xsii_td3_qfq DECIMAL(15, 4) COMMENT 'XSII-TD3(前复权)',
    xsii_td4_bfq DECIMAL(15, 4) COMMENT 'XSII-TD4(不复权)',
    xsii_td4_hfq DECIMAL(15, 4) COMMENT 'XSII-TD4(后复权)',
    xsii_td4_qfq DECIMAL(15, 4) COMMENT 'XSII-TD4(前复权)',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    UNIQUE KEY uk_ts_code_trade_date (ts_code, trade_date),
    KEY idx_trade_date (trade_date),
    KEY idx_ts_code (ts_code),
    KEY idx_kdj_k_qfq (kdj_k_qfq),
    KEY idx_kdj_d_qfq (kdj_d_qfq),
    KEY idx_kdj_qfq (kdj_qfq),
    KEY idx_macd_dif_qfq (macd_dif_qfq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='股票技术面因子基础数据表';

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
