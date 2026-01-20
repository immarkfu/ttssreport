-- 创建备用行情数据表
CREATE TABLE IF NOT EXISTS bak_daily_data (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    ts_code VARCHAR(20) NOT NULL COMMENT '股票代码',
    trade_date VARCHAR(8) NOT NULL COMMENT '交易日期(YYYYMMDD)',
    name VARCHAR(50) COMMENT '股票名称',
    pct_change DECIMAL(10, 4) COMMENT '涨跌幅(%)',
    close_price DECIMAL(15, 4) COMMENT '收盘价',
    price_change DECIMAL(15, 4) COMMENT '涨跌额',
    open_price DECIMAL(15, 4) COMMENT '开盘价',
    high_price DECIMAL(15, 4) COMMENT '最高价',
    low_price DECIMAL(15, 4) COMMENT '最低价',
    pre_close DECIMAL(15, 4) COMMENT '昨收价',
    vol_ratio DECIMAL(10, 4) COMMENT '量比',
    turn_over DECIMAL(10, 4) COMMENT '换手率(%)',
    swing DECIMAL(10, 4) COMMENT '振幅(%)',
    vol BIGINT COMMENT '成交量(手)',
    amount DECIMAL(20, 2) COMMENT '成交额(千元)',
    selling BIGINT COMMENT '内盘-主动卖(手)',
    buying BIGINT COMMENT '外盘-主动买(手)',
    total_share DECIMAL(15, 4) COMMENT '总股本(亿)',
    float_share DECIMAL(15, 4) COMMENT '流通股本(亿)',
    pe DECIMAL(15, 4) COMMENT '市盈率(动)',
    industry VARCHAR(50) COMMENT '所属行业',
    area VARCHAR(50) COMMENT '所属地域',
    float_mv DECIMAL(20, 2) COMMENT '流通市值(万元)',
    total_mv DECIMAL(20, 2) COMMENT '总市值(万元)',
    avg_price DECIMAL(15, 4) COMMENT '平均价',
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
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='备用行情数据表';

-- 创建技术面因子数据表
CREATE TABLE IF NOT EXISTS stk_factor_pro_data (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    ts_code VARCHAR(20) NOT NULL COMMENT '股票代码',
    trade_date VARCHAR(8) NOT NULL COMMENT '交易日期(YYYYMMDD)',
    
    -- 基础价格字段(不复权)
    open_price DECIMAL(15, 4) COMMENT '开盘价',
    high_price DECIMAL(15, 4) COMMENT '最高价',
    low_price DECIMAL(15, 4) COMMENT '最低价',
    close_price DECIMAL(15, 4) COMMENT '收盘价',
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
    price_change DECIMAL(15, 4) COMMENT '涨跌额',
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
    
    -- 连续涨跌天数
    updays INT COMMENT '连涨天数',
    downdays INT COMMENT '连跌天数',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_ts_code_trade_date (ts_code, trade_date),
    KEY idx_trade_date (trade_date),
    KEY idx_ts_code (ts_code),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技术面因子数据表';

-- 创建数据集成日志表
CREATE TABLE IF NOT EXISTS data_integration_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    trade_date VARCHAR(8) NOT NULL COMMENT '交易日期(YYYYMMDD)',
    data_type VARCHAR(50) NOT NULL COMMENT '数据类型(bak_daily/stk_factor_pro)',
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

-- 创建股票代码列表表
CREATE TABLE IF NOT EXISTS stock_list (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    ts_code VARCHAR(20) NOT NULL UNIQUE COMMENT '股票代码',
    symbol VARCHAR(10) COMMENT '股票简称',
    name VARCHAR(50) COMMENT '股票名称',
    area VARCHAR(50) COMMENT '地域',
    industry VARCHAR(50) COMMENT '行业',
    market VARCHAR(20) COMMENT '市场(主板/创业板/科创板)',
    list_date VARCHAR(8) COMMENT '上市日期',
    is_active TINYINT DEFAULT 1 COMMENT '是否活跃(1=是,0=否)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    KEY idx_ts_code (ts_code),
    KEY idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='股票代码列表表';
