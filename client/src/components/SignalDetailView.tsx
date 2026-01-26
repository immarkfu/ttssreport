/**
 * 信号详情视图组件 - 左表右图联动
 * 设计风格：功能主义 - 表格完整显示 + 主图+成交量+KDJ三区图表
 * 新增：配置面板实时预览功能
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { StockSignal, generateKLineData, KLineData } from '@/data/mockData';
import SignalTable from './SignalTable';
import KLineChart from './charts/KLineChart';
import ConfigPanel, { S1Config } from './ConfigPanel';

export interface B1Config {
  b1JThreshold: number;
}
import { toast } from 'sonner';
import { b1SignalService, B1SignalResult, TagItem, StockIndicator } from '@/services/b1SignalService';
import { configService, UserConfig } from '@/services/configService';

interface SignalDetailViewProps {
  signals: StockSignal[];
  type: 'B1' | 'S1';
  backtestPool: Set<string>;
  onBacktestPoolChange: (code: string, checked: boolean) => void;
}

const defaultB1Config: B1Config = {
  b1JThreshold: 13,
};

const defaultS1Config: S1Config = {
  s1BreakWhiteLine: true,
  s1LongYangFly: true,
  s1JThreshold: 85,
  s1VolumeCondition: true,
};

export default function SignalDetailView({ 
  signals, 
  type, 
  backtestPool, 
  onBacktestPoolChange 
}: SignalDetailViewProps) {
  const [selectedSignal, setSelectedSignal] = useState<StockSignal | null>(null);
  const [klineData, setKlineData] = useState<KLineData[]>([]);
  const [indicatorData, setIndicatorData] = useState<StockIndicator[]>([]);
  const [localSignals, setLocalSignals] = useState<StockSignal[]>(signals);
  const [filteredSignals, setFilteredSignals] = useState<StockSignal[]>(signals);
  const [totalSignals, setTotalSignals] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [chartLoading, setChartLoading] = useState(false);
  
  const [config, setConfig] = useState<B1Config | S1Config>(
    type === 'B1' ? defaultB1Config : defaultS1Config
  );
  const [serverConfig, setServerConfig] = useState<UserConfig | null>(null);
  
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedTagCodes, setSelectedTagCodes] = useState<string[]>([]);
  const [disabledTagCodes, setDisabledTagCodes] = useState<string[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);
  
  // 防抖定时器引用
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 组件卸载时清除防抖定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    configService.get().then(setServerConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (type === 'B1') {
      b1SignalService.getConfigTags().then((res) => {
        setTags(res.data);
        const enabledCodes = res.data.filter(t => t.is_enabled === 1).map(t => t.tag_code);
        setSelectedTagCodes(enabledCodes);
        const jTag = res.data.find(t => t.tag_code === 'j_lt_13_qfq');
        const macdTag = res.data.find(t => t.tag_code === 'macd_dif_gt_0_qfq');
        setConfig(prev => ({
          ...prev,
          b1JThreshold: jTag?.threshold_value ?? 13,
        } as B1Config));
      }).catch(() => {});
    }
  }, [type]);

  const mapB1Result = useCallback((item: B1SignalResult): StockSignal => {
    // 生成展示要素名称到 tag_code 的映射
    const tagNameToCodeMap: Record<string, string> = {};
    if (item.matched_tag_names && item.matched_tag_codes) {
      for (let i = 0; i < item.matched_tag_names.length && i < item.matched_tag_codes.length; i++) {
        tagNameToCodeMap[item.matched_tag_names[i]] = item.matched_tag_codes[i];
      }
    }
    
    return ({
      id: item.ts_code,
      code: item.ts_code.replace(/\.(SH|SZ|BJ)$/, ''),
      name: item.stock_name,
      industry: item.industry || '未知',
      signalType: 'B1' as const,
      signalStrength: item.signal_strength === 'strong' ? 'strong' : item.signal_strength === 'medium' ? 'medium' : 'weak',
      price: item.close_price,
      change: item.price_change,
      changePercent: item.pct_change,
      volume: item.volume,
      triggerTime: item.trigger_time,
      triggerCondition: item.display_factor,
      displayFactor: item.display_factor,
      matched_tag_codes: item.matched_tag_codes || [],
      matched_tag_names: item.matched_tag_names || [],
      tagNameToCodeMap,
      j_value: item.j_value,
      k_value: item.k_value,
      d_value: item.d_value,
    });
  }, []);

  // 使用 useCallback 缓存 fetchB1Data 函数，避免每次渲染都重新创建
  const fetchB1Data = useCallback(async (page: number, size: number) => {
    try {
      setLoading(true);
      const b1Config = config as B1Config;
      const response = await b1SignalService.getResults(
        undefined,
        undefined,
        page,
        size,
        b1Config.b1JThreshold,
        disabledTagCodes.length > 0 ? disabledTagCodes : undefined
      );
      const mapped = response.data.map(mapB1Result);
      setLocalSignals(mapped);
      setFilteredSignals(mapped);
      setTotalSignals(response.total);
      setCurrentPage(page);
      setPageSize(size);
    } catch (error) {
      console.error('获取B1信号失败:', error);
      setLocalSignals(signals);
      setFilteredSignals(signals);
      setTotalSignals(0);
    } finally {
      setLoading(false);
    }
  }, [config, disabledTagCodes, signals, mapB1Result]);

  // 防抖函数
  const debouncedFetchB1Data = useCallback((page: number, size: number) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      fetchB1Data(page, size);
    }, 300);
  }, [fetchB1Data]);

  const handlePageChange = (page: number, size: number) => {
    if (type === 'B1') {
      fetchB1Data(page, size);
    }
  };

  useEffect(() => {
    if (type === 'B1') {
      fetchB1Data(1, 20);
    } else {
      if (signals.length > 0) {
        setLocalSignals(signals);
        setFilteredSignals(signals);
      }
    }
  }, [type, signals, mapB1Result]);

  useEffect(() => {
    if (serverConfig) {
      if (type === 'B1') {
          setConfig({
          b1JThreshold: serverConfig.b1JValueThreshold ?? 13,
        });
        } else {
        setConfig({
          s1BreakWhiteLine: serverConfig.s1WhiteLineBreak ?? true,
          s1LongYangFly: serverConfig.s1LongYangFly ?? true,
          s1JThreshold: serverConfig.s1JValueHigh ?? 85,
          s1VolumeCondition: serverConfig.s1VolumeCondition ?? true,
        });
      }
    }
  }, [serverConfig, type]);

  useEffect(() => {
    if (type === 'B1') {
      debouncedFetchB1Data(1, pageSize);
    }
  }, [(config as B1Config).b1JThreshold, debouncedFetchB1Data, pageSize]);

  // 当filteredSignals或type变化时，重置选中状态为第一只股票
  useEffect(() => {
    if (filteredSignals.length > 0) {
      setSelectedSignal(filteredSignals[0]);
    } else {
      setSelectedSignal(null);
    }
  }, [filteredSignals, type]);

  // 当选中的股票变化时，更新K线数据
  useEffect(() => {
    const fetchStockDetail = async () => {
      if (!selectedSignal) {
        setKlineData([]);
        setIndicatorData([]);
        return;
      }

      try {
        setChartLoading(true);
        // 从 selectedSignal.id 获取完整的股票代码（包含后缀），因为 code 字段已经去掉了后缀
        const tsCode = selectedSignal.id;

        const response = await b1SignalService.getStockDetail(tsCode);

        if (response.success && response.data) {
          const kline: KLineData[] = response.data.kline.map(item => {
            let time = item.time;
            if (time && /^\d{8}$/.test(time)) {
              time = `${time.slice(0, 4)}-${time.slice(4, 6)}-${time.slice(6, 8)}`;
            }
            return {
              time,
              open: item.open ?? 0,
              high: item.high ?? 0,
              low: item.low ?? 0,
              close: item.close ?? 0,
              volume: item.volume ?? 0,
            };
          });
          setKlineData(kline);
          setIndicatorData(response.data.indicators);
        } else {
          const data = generateKLineData(selectedSignal.price);
          setKlineData(data);
          setIndicatorData([]);
        }
      } catch (error) {
        console.error('获取股票详情失败:', error);
        const data = generateKLineData(selectedSignal.price);
        setKlineData(data);
        setIndicatorData([]);
      } finally {
        setChartLoading(false);
      }
    };

    fetchStockDetail();
  }, [selectedSignal]);

  const handleSelectSignal = (signal: StockSignal) => {
    setSelectedSignal(signal);
  };

  const handleConfigChange = (newConfig: B1Config | S1Config) => {
    setConfig(newConfig);
  };

  const handleTagsChange = (codes: string[]) => {
    setDisabledTagCodes(codes);
    debouncedFetchB1Data(1, pageSize);
  };

  const handleConfigSave = async () => {
    try {
      if (type === 'B1') {
        const b1Config = config as B1Config;
        await configService.update({
          b1JValueThreshold: b1Config.b1JThreshold,
        });
      } else {
        const s1Config = config as S1Config;
        await configService.update({
          s1WhiteLineBreak: s1Config.s1BreakWhiteLine,
          s1LongYangFly: s1Config.s1LongYangFly,
          s1JValueHigh: s1Config.s1JThreshold,
          s1VolumeCondition: s1Config.s1VolumeCondition,
        });
      }
      toast.success('配置已保存', { description: '参数设置已更新' });
    } catch (error: any) {
      toast.error('保存失败', { description: error.message });
    }
  };

  const handleSaveConfig = async () => {
    try {
      setFilterLoading(true);
      const b1Config = config as B1Config;
      await b1SignalService.saveThreshold('j_lt_13_qfq', b1Config.b1JThreshold);
      fetchB1Data(1, pageSize);
      toast.success('保存成功', { description: '配置已保存' });
    } catch (error: any) {
      toast.error('保存失败', { description: error.message });
    } finally {
      setFilterLoading(false);
    }
  };

  const handleSaveTagsConfig = async (tagConfigs: { id: number; is_enabled: number; threshold_value: number | null }[]) => {
    try {
      await b1SignalService.saveTagConfig(tagConfigs);
      handleSaveConfig();
    } catch (error: any) {
      toast.error('保存标签配置失败', { description: error.message });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 h-[calc(100vh-280px)]">
        {/* 左侧：信号列表表格 (55%) - 确保表格完整显示 */}
        <div className="w-[55%]">
          <SignalTable
            signals={filteredSignals}
            total={totalSignals}
            selectedId={selectedSignal?.id || null}
            onSelect={handleSelectSignal}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            type={type}
            backtestPool={backtestPool}
            onBacktestPoolChange={onBacktestPoolChange}
          />
        </div>

        {/* 右侧：K线图区域 (45%) - 主图+成交量+KDJ三区布局 */}
        <div className="w-[45%] flex flex-col gap-2">
          {/* 触发条件信息 */}
          <div className="text-sm text-muted-foreground">
            {selectedSignal ? (
              <span>
                触发条件: <span className="text-foreground font-medium">{selectedSignal.triggerCondition}</span>
              </span>
            ) : (
              '请选择股票查看详情'
            )}
          </div>

          {/* K线图 - 主图+成交量+KDJ */}
          <div className="flex-1 relative">
            {chartLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <KLineChart
              data={klineData}
              stockName={selectedSignal?.name}
              stockCode={selectedSignal?.code}
              kdjValues={selectedSignal ? {
                j: selectedSignal.j_value ?? 0,
                k: selectedSignal.k_value ?? 0,
                d: selectedSignal.d_value ?? 0,
              } : undefined}
              indicators={indicatorData}
            />
          </div>
        </div>
      </div>

      {/* 配置面板 - 集成到布局中 */}
      <div className="w-full">
        <ConfigPanel
          type={type}
          config={config as B1Config | S1Config}
          onChange={handleConfigChange}
          onSave={handleConfigSave}
          tags={tags}
          selectedTagCodes={selectedTagCodes}
          onTagCodesChange={setSelectedTagCodes}
          onTagsChange={handleTagsChange}
          onSaveConfig={handleSaveConfig}
          onSaveTagsConfig={handleSaveTagsConfig}
          filterLoading={filterLoading}
        />
      </div>
    </div>
  );
}
