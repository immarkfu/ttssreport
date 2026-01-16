/**
 * 信号详情视图组件 - 左表右图联动
 * 设计风格：功能主义 - 40%表格 + 60%图表
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
      {/* 左侧：信号列表表格 (40%) */}
      <div className="w-2/5">
        <SignalTable
          signals={signals}
          selectedId={selectedSignal?.id || null}
          onSelect={handleSelectSignal}
          type={type}
        />
      </div>

      {/* 右侧：K线图区域 (60%) */}
      <div className="w-3/5 flex flex-col gap-4">
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

        {/* K线图 */}
        <div className="flex-1">
          <KLineChart
            data={klineData}
            stockName={selectedSignal?.name}
            stockCode={selectedSignal?.code}
            indicator={indicator}
          />
        </div>

        {/* 信号详情卡片 */}
        {selectedSignal && (
          <div className="bg-card rounded-lg border border-border/50 p-4">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">触发时间</span>
                <p className="font-mono mt-1">{selectedSignal.triggerTime}</p>
              </div>
              <div>
                <span className="text-muted-foreground">成交量</span>
                <p className="font-mono mt-1">{(selectedSignal.volume / 10000).toFixed(0)}万手</p>
              </div>
              <div>
                <span className="text-muted-foreground">所属行业</span>
                <p className="mt-1">{selectedSignal.industry}</p>
              </div>
              <div>
                <span className="text-muted-foreground">信号类型</span>
                <p className={`mt-1 font-medium ${type === 'B1' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {type === 'B1' ? '观察信号' : '卖出信号'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
