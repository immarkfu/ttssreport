/**
 * 信号详情视图组件 - 左表右图联动
 * 设计风格：功能主义 - 表格完整显示 + 主图+成交量+KDJ三区图表
 * 新增：配置面板实时预览功能
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { StockSignal, generateKLineData } from '@/data/mockData';
import SignalTable from './SignalTable';
import KLineChart from './charts/KLineChart';
import ConfigPanel, { S1Config } from './ConfigPanel';

export interface B1Config {
  b1JThreshold: number;
  b1VolumeRatio: number;
  b1RedGreenCondition: boolean;
}
import { toast } from 'sonner';
import { b1SignalService, B1SignalResult, TagItem } from '@/services/b1SignalService';
import { configService, UserConfig } from '@/services/configService';

interface SignalDetailViewProps {
  signals: StockSignal[];
  type: 'B1' | 'S1';
  backtestPool: Set<string>;
  onBacktestPoolChange: (code: string, checked: boolean) => void;
}

const defaultB1Config: B1Config = {
  b1JThreshold: 20,
  b1VolumeRatio: 1.0,
  b1RedGreenCondition: true,
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
  const [klineData, setKlineData] = useState<ReturnType<typeof generateKLineData>>([]);
  const [localSignals, setLocalSignals] = useState<StockSignal[]>(signals);
  const [filteredSignals, setFilteredSignals] = useState<StockSignal[]>(signals);
  const [loading, setLoading] = useState(false);
  
  const [config, setConfig] = useState<B1Config | S1Config>(
    type === 'B1' ? defaultB1Config : defaultS1Config
  );
  const [serverConfig, setServerConfig] = useState<UserConfig | null>(null);
  
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedTagCodes, setSelectedTagCodes] = useState<string[]>([]);
  const [tradeDate, setTradeDate] = useState<string>('');
  const [filterLoading, setFilterLoading] = useState(false);
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

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
          b1JThreshold: jTag?.threshold_value ?? 20,
        } as B1Config));
      }).catch(() => {});
    }
  }, [type]);

  const mapB1Result = useCallback((item: B1SignalResult): StockSignal => ({
    id: item.ts_code,
    code: item.ts_code.replace('.SH', '').replace('.SZ', ''),
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
    j_value: item.j_value,
    k_value: item.k_value,
    d_value: item.d_value,
  }), []);

  useEffect(() => {
    if (type === 'B1') {
      const fetchB1Data = async () => {
        try {
          setLoading(true);
          const response = await b1SignalService.getResults(undefined, undefined, 100);
          const mapped = response.data.map(mapB1Result);
          setLocalSignals(mapped);
          setFilteredSignals(mapped);
        } catch (error) {
          console.error('获取B1信号失败:', error);
          setLocalSignals(signals);
          setFilteredSignals(signals);
        } finally {
          setLoading(false);
        }
      };
      fetchB1Data();
    } else {
      setLocalSignals(signals);
      setFilteredSignals(signals);
    }
  }, [type, signals, mapB1Result]);

  useEffect(() => {
    if (serverConfig) {
      if (type === 'B1') {
          setConfig({
          b1JThreshold: serverConfig.b1JValueThreshold ?? 20,
          b1VolumeRatio: parseFloat(serverConfig.b1VolumeRatio ?? '1.0'),
          b1RedGreenCondition: serverConfig.b1RedGreenCondition ?? true,
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

  // 根据配置过滤信号（实时预览）
  const filterSignalsByConfig = useCallback((signals: StockSignal[], config: B1Config | S1Config) => {
    if (type === 'B1') {
      // B1数据已由后端筛选，直接返回
      return signals;
    } else {
      const s1Config = config as S1Config;
      return signals.filter(signal => {
        // 根据J值超买阈值过滤
        const jValue = parseFloat(signal.triggerCondition.match(/J值:(\d+\.?\d*)/)?.[1] || '0');
        if (jValue < s1Config.s1JThreshold) return false;
        
        // 根据跌破白线条件过滤
        if (s1Config.s1BreakWhiteLine && !signal.triggerCondition.includes('跌破白线')) {
          // 如果开启了该条件但信号不包含，则保留（因为可能是其他触发条件）
        }
        
        // 根据长阳放飞条件过滤
        if (s1Config.s1LongYangFly && !signal.triggerCondition.includes('长阳放飞')) {
          // 如果开启了该条件但信号不包含，则保留（因为可能是其他触发条件）
        }
        
        // 根据放量条件过滤
        if (s1Config.s1VolumeCondition && !signal.triggerCondition.includes('放量')) {
          return false;
        }
        
        return true;
      });
    }
  }, [type]);

  // 配置变化时，500ms后更新过滤结果
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      const filtered = filterSignalsByConfig(localSignals, config);
      setFilteredSignals(filtered);
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [config, localSignals, filterSignalsByConfig]);

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
    if (selectedSignal) {
      const data = generateKLineData(selectedSignal.price);
      setKlineData(data);
    } else {
      setKlineData([]);
    }
  }, [selectedSignal]);

  const handleSelectSignal = (signal: StockSignal) => {
    setSelectedSignal(signal);
  };

  const handleTagUpdate = async (id: number, thresholdValue: number | null, isUpdate: boolean) => {
    try {
      await b1SignalService.saveConfigTag(id, thresholdValue, isUpdate);
      toast.success(isUpdate ? '阈值已更新' : '启用状态已切换');
      const res = await b1SignalService.getConfigTags();
      setTags(res.data);
    } catch (error: any) {
      toast.error('更新失败', { description: error.message });
    }
  };

  const handleConfigChange = (newConfig: B1Config | S1Config) => {
    setConfig(newConfig);
  };

  const handleConfigSave = async () => {
    try {
      if (type === 'B1') {
        const b1Config = config as B1Config;
        await configService.update({
          b1JValueThreshold: b1Config.b1JThreshold,
          b1VolumeRatio: b1Config.b1VolumeRatio.toString(),
          b1RedGreenCondition: b1Config.b1RedGreenCondition,
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

  const handleFilter = async () => {
    if (!tradeDate) return;
    try {
      setFilterLoading(true);
      const b1Config = config as B1Config;
      const response = await b1SignalService.filterAndTag(
        tradeDate, 
        selectedTagCodes.length > 0 ? selectedTagCodes : undefined, 
        false,
        b1Config.b1JThreshold
      );
      const mapped = response.data.map(mapB1Result);
      setLocalSignals(mapped);
      setFilteredSignals(mapped);
      toast.success('筛选完成', { description: `共${response.total}条记录` });
    } catch (error: any) {
      toast.error('筛选失败', { description: error.message });
    } finally {
      setFilterLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!tradeDate) return;
    try {
      setFilterLoading(true);
      const b1Config = config as B1Config;
      const response = await b1SignalService.filterAndTag(
        tradeDate, 
        selectedTagCodes.length > 0 ? selectedTagCodes : undefined, 
        true,
        b1Config.b1JThreshold
      );
      const mapped = response.data.map(mapB1Result);
      setLocalSignals(mapped);
      setFilteredSignals(mapped);
      if (selectedTagCodes.length > 0) {
        await b1SignalService.saveTagConfig(selectedTagCodes);
      }
      await b1SignalService.saveThreshold('j_lt_13_qfq', b1Config.b1JThreshold);
      toast.success('保存成功', { description: `共${response.saved}条记录已保存` });
    } catch (error: any) {
      toast.error('保存失败', { description: error.message });
    } finally {
      setFilterLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 h-[calc(100vh-280px)]">
        {/* 左侧：信号列表表格 (55%) - 确保表格完整显示 */}
        <div className="w-[55%]">
          <SignalTable
            signals={filteredSignals}
            selectedId={selectedSignal?.id || null}
            onSelect={handleSelectSignal}
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
          <div className="flex-1">
            <KLineChart
              data={klineData}
              stockName={selectedSignal?.name}
              stockCode={selectedSignal?.code}
              kdjValues={selectedSignal ? {
                j: selectedSignal.j_value ?? 0,
                k: selectedSignal.k_value ?? 0,
                d: selectedSignal.d_value ?? 0,
              } : undefined}
            />
          </div>
        </div>
      </div>

      {/* 配置面板 - 集成到布局中 */}
      <div className="w-full">
        <ConfigPanel
          type={type}
          config={config}
          onChange={handleConfigChange}
          onSave={handleConfigSave}
          tags={tags}
          selectedTagCodes={selectedTagCodes}
          onTagCodesChange={setSelectedTagCodes}
          tradeDate={tradeDate}
          onTradeDateChange={setTradeDate}
          onFilter={handleFilter}
          onSaveConfig={handleSaveConfig}
          filterLoading={filterLoading}
          onTagUpdate={handleTagUpdate}
        />
      </div>
    </div>
  );
}
