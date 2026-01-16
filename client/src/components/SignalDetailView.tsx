/**
 * 信号详情视图组件 - 左表右图联动
 * 设计风格：功能主义 - 表格完整显示 + 紧凑图表
 */

import { useState, useEffect } from 'react';
import { StockSignal, stockKLineDataMap, generateKLineData } from '@/data/mockData';
import SignalTable from './SignalTable';
import KLineChart from './charts/KLineChart';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SignalDetailViewProps {
  signals: StockSignal[];
  type: 'B1' | 'S1';
}

export default function SignalDetailView({ signals, type }: SignalDetailViewProps) {
  const [selectedSignal, setSelectedSignal] = useState<StockSignal | null>(null);
  const [indicator, setIndicator] = useState<'kdj' | 'macd' | 'volume'>('kdj');
  const [klineData, setKlineData] = useState<ReturnType<typeof generateKLineData>>([]);

  // 当signals或type变化时，重置选中状态为第一只股票
  useEffect(() => {
    if (signals.length > 0) {
      setSelectedSignal(signals[0]);
    } else {
      setSelectedSignal(null);
    }
  }, [signals, type]);

  // 当选中的股票变化时，更新K线数据
  useEffect(() => {
    if (selectedSignal) {
      const data = stockKLineDataMap[selectedSignal.code] || generateKLineData(selectedSignal.price);
      setKlineData(data);
    } else {
      setKlineData([]);
    }
  }, [selectedSignal]);

  const handleSelectSignal = (signal: StockSignal) => {
    setSelectedSignal(signal);
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-180px)]">
      {/* 左侧：信号列表表格 (55%) - 确保表格完整显示 */}
      <div className="w-[55%]">
        <SignalTable
          signals={signals}
          selectedId={selectedSignal?.id || null}
          onSelect={handleSelectSignal}
          type={type}
        />
      </div>

      {/* 右侧：K线图区域 (45%) - 紧凑布局 */}
      <div className="w-[45%] flex flex-col gap-3">
        {/* 指标切换 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedSignal ? (
              <span>
                触发条件: <span className="text-foreground font-medium">{selectedSignal.triggerCondition}</span>
              </span>
            ) : (
              '请选择股票查看详情'
            )}
          </div>
          <Tabs value={indicator} onValueChange={(v) => setIndicator(v as typeof indicator)}>
            <TabsList className="h-8">
              <TabsTrigger value="kdj" className="text-xs px-3 h-7">KDJ</TabsTrigger>
              <TabsTrigger value="macd" className="text-xs px-3 h-7">MACD</TabsTrigger>
              <TabsTrigger value="volume" className="text-xs px-3 h-7">成交量</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* K线图 - 占满剩余空间 */}
        <div className="flex-1">
          <KLineChart
            data={klineData}
            stockName={selectedSignal?.name}
            stockCode={selectedSignal?.code}
            indicator={indicator}
          />
        </div>
      </div>
    </div>
  );
}
