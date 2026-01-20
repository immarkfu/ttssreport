/**
 * 信号详情视图组件 - 左表右图联动
 * 设计风格：功能主义 - 表格完整显示 + 主图+成交量+KDJ三区图表
 * 新增：配置面板实时预览功能
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { StockSignal, generateKLineData } from '@/data/mockData';
import SignalTable from './SignalTable';
import KLineChart from './charts/KLineChart';
import ConfigPanel, { B1Config, S1Config } from './ConfigPanel';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface SignalDetailViewProps {
  signals: StockSignal[];
  type: 'B1' | 'S1';
  backtestPool: Set<string>;
  onBacktestPoolChange: (code: string, checked: boolean) => void;
}

const defaultB1Config: B1Config = {
  b1JThreshold: 13,
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
  const [filteredSignals, setFilteredSignals] = useState<StockSignal[]>(signals);
  
  // 配置状态
  const [config, setConfig] = useState<B1Config | S1Config>(
    type === 'B1' ? defaultB1Config : defaultS1Config
  );
  
  // 防抖定时器
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // 获取服务器配置
  const { data: serverConfig } = trpc.config.get.useQuery();
  
  // 更新配置mutation
  const updateConfig = trpc.config.update.useMutation({
    onSuccess: () => {
      toast.success('配置已保存', {
        description: '参数设置已更新',
      });
    },
    onError: (error) => {
      toast.error('保存失败', {
        description: error.message,
      });
    },
  });

  // 从服务器配置初始化本地状态
  useEffect(() => {
    if (serverConfig) {
      if (type === 'B1') {
        setConfig({
          b1JThreshold: serverConfig.b1JValueThreshold ?? 13,
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
      const b1Config = config as B1Config;
      return signals.filter(signal => {
        // 根据J值阈值过滤
        const jValue = parseFloat(signal.triggerCondition.match(/J值:(\d+\.?\d*)/)?.[1] || '0');
        if (jValue > b1Config.b1JThreshold) return false;
        
        // 根据量比阈值过滤
        const volumeRatio = parseFloat(signal.triggerCondition.match(/量比:(\d+\.?\d*)x/)?.[1] || '0');
        if (volumeRatio < b1Config.b1VolumeRatio) return false;
        
        // 根据红肥绿瘦条件过滤
        if (b1Config.b1RedGreenCondition && !signal.triggerCondition.includes('红肥绿瘦')) {
          return false;
        }
        
        return true;
      });
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
      const filtered = filterSignalsByConfig(signals, config);
      setFilteredSignals(filtered);
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [config, signals, filterSignalsByConfig]);

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

  const handleConfigChange = (newConfig: B1Config | S1Config) => {
    setConfig(newConfig);
  };

  const handleConfigSave = () => {
    if (type === 'B1') {
      const b1Config = config as B1Config;
      updateConfig.mutate({
        b1JValueThreshold: b1Config.b1JThreshold,
        b1VolumeRatio: b1Config.b1VolumeRatio.toString(),
        b1RedGreenCondition: b1Config.b1RedGreenCondition,
      });
    } else {
      const s1Config = config as S1Config;
      updateConfig.mutate({
        s1WhiteLineBreak: s1Config.s1BreakWhiteLine,
        s1LongYangFly: s1Config.s1LongYangFly,
        s1JValueHigh: s1Config.s1JThreshold,
        s1VolumeCondition: s1Config.s1VolumeCondition,
      });
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-4 h-[calc(100vh-180px)]">
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
            />
          </div>
        </div>
      </div>

      {/* 配置面板 - 右下角浮动 */}
      <ConfigPanel
        type={type}
        config={config}
        onChange={handleConfigChange}
        onSave={handleConfigSave}
      />
    </div>
  );
}
