/**
 * K线图组件 - 使用 lightweight-charts v5
 * 设计风格：功能主义 - 形式追随功能
 */

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  CandlestickData,
  ColorType,
  CrosshairMode,
  LineSeries,
  HistogramSeries,
  CandlestickSeries,
} from 'lightweight-charts';
import { KLineData, calculateKDJ, calculateMACD } from '@/data/mockData';

interface KLineChartProps {
  data: KLineData[];
  stockName?: string;
  stockCode?: string;
  indicator: 'kdj' | 'macd' | 'volume';
}

export default function KLineChart({ data, stockName, stockCode, indicator }: KLineChartProps) {
  const mainChartRef = useRef<HTMLDivElement>(null);
  const subChartRef = useRef<HTMLDivElement>(null);
  const mainChart = useRef<IChartApi | null>(null);
  const subChart = useRef<IChartApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mainChartRef.current || !subChartRef.current || data.length === 0) return;

    setIsLoading(true);

    // 清理旧图表
    if (mainChart.current) {
      mainChart.current.remove();
      mainChart.current = null;
    }
    if (subChart.current) {
      subChart.current.remove();
      subChart.current = null;
    }

    // 图表通用配置
    const chartOptions = {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748B',
        fontFamily: "'Inter', 'Noto Sans SC', sans-serif",
      },
      grid: {
        vertLines: { color: '#E2E8F0', style: 1 as const },
        horzLines: { color: '#E2E8F0', style: 1 as const },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#94A3B8',
          width: 1 as const,
          style: 2 as const,
          labelBackgroundColor: '#334155',
        },
        horzLine: {
          color: '#94A3B8',
          width: 1 as const,
          style: 2 as const,
          labelBackgroundColor: '#334155',
        },
      },
      timeScale: {
        borderColor: '#E2E8F0',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#E2E8F0',
      },
    };

    // 创建主图表 (K线)
    mainChart.current = createChart(mainChartRef.current, {
      ...chartOptions,
      width: mainChartRef.current.clientWidth,
      height: 320,
    });

    // 添加K线系列 (v5 API)
    const candlestickSeries = mainChart.current.addSeries(CandlestickSeries, {
      upColor: '#DC2626',
      downColor: '#22C55E',
      borderUpColor: '#DC2626',
      borderDownColor: '#22C55E',
      wickUpColor: '#DC2626',
      wickDownColor: '#22C55E',
    });

    // 转换数据格式
    const candleData: CandlestickData[] = data.map(d => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candlestickSeries.setData(candleData);

    // 创建副图表 (指标)
    subChart.current = createChart(subChartRef.current, {
      ...chartOptions,
      width: subChartRef.current.clientWidth,
      height: 150,
    });

    // 根据选择的指标添加不同的系列
    if (indicator === 'kdj') {
      const kdjData = calculateKDJ(data);
      
      const kSeries = subChart.current.addSeries(LineSeries, {
        color: '#3B82F6',
        lineWidth: 1,
        title: 'K',
      });
      const dSeries = subChart.current.addSeries(LineSeries, {
        color: '#F59E0B',
        lineWidth: 1,
        title: 'D',
      });
      const jSeries = subChart.current.addSeries(LineSeries, {
        color: '#8B5CF6',
        lineWidth: 1,
        title: 'J',
      });

      kSeries.setData(kdjData.map(d => ({ time: d.time, value: d.k! })));
      dSeries.setData(kdjData.map(d => ({ time: d.time, value: d.d! })));
      jSeries.setData(kdjData.map(d => ({ time: d.time, value: d.j! })));
    } else if (indicator === 'macd') {
      const macdData = calculateMACD(data);
      
      const macdSeries = subChart.current.addSeries(LineSeries, {
        color: '#3B82F6',
        lineWidth: 1,
        title: 'DIF',
      });
      const signalSeries = subChart.current.addSeries(LineSeries, {
        color: '#F59E0B',
        lineWidth: 1,
        title: 'DEA',
      });
      const histogramSeries = subChart.current.addSeries(HistogramSeries, {
        title: 'MACD',
      });

      macdSeries.setData(macdData.map(d => ({ time: d.time, value: d.macd! })));
      signalSeries.setData(macdData.map(d => ({ time: d.time, value: d.signal! })));
      histogramSeries.setData(macdData.map(d => ({
        time: d.time,
        value: d.histogram!,
        color: d.histogram! >= 0 ? '#DC2626' : '#22C55E',
      })));
    } else {
      // 成交量
      const volumeSeries = subChart.current.addSeries(HistogramSeries, {
        title: 'VOL',
        priceFormat: {
          type: 'volume',
        },
      });

      volumeSeries.setData(data.map((d, i) => ({
        time: d.time,
        value: d.volume,
        color: i > 0 && d.close >= data[i - 1].close ? '#DC2626' : '#22C55E',
      })));
    }

    // 同步两个图表的时间轴
    mainChart.current.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range && subChart.current) {
        subChart.current.timeScale().setVisibleLogicalRange(range);
      }
    });

    subChart.current.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range && mainChart.current) {
        mainChart.current.timeScale().setVisibleLogicalRange(range);
      }
    });

    // 自适应宽度
    mainChart.current.timeScale().fitContent();
    subChart.current.timeScale().fitContent();

    setIsLoading(false);

    // 响应式调整
    const handleResize = () => {
      if (mainChartRef.current && mainChart.current) {
        mainChart.current.applyOptions({ width: mainChartRef.current.clientWidth });
      }
      if (subChartRef.current && subChart.current) {
        subChart.current.applyOptions({ width: subChartRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mainChart.current) {
        mainChart.current.remove();
        mainChart.current = null;
      }
      if (subChart.current) {
        subChart.current.remove();
        subChart.current = null;
      }
    };
  }, [data, indicator]);

  const indicatorLabels = {
    kdj: 'KDJ指标',
    macd: 'MACD指标',
    volume: '成交量',
  };

  return (
    <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
      {/* 图表头部 */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {stockCode && stockName ? (
            <>
              <span className="font-mono text-sm text-muted-foreground">{stockCode}</span>
              <span className="font-medium">{stockName}</span>
            </>
          ) : (
            <span className="text-muted-foreground">请选择股票查看K线</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          日K线 · {indicatorLabels[indicator]}
        </div>
      </div>

      {/* K线主图 */}
      <div className="relative">
        {isLoading && data.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div ref={mainChartRef} className="w-full" style={{ height: 320 }} />
      </div>

      {/* 指标副图 */}
      <div className="border-t border-border/50">
        <div ref={subChartRef} className="w-full" style={{ height: 150 }} />
      </div>

      {/* 图例 */}
      <div className="px-4 py-2 border-t border-border/50 flex items-center gap-4 text-xs">
        {indicator === 'kdj' && (
          <>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-blue-500" />K
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-amber-500" />D
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-purple-500" />J
            </span>
          </>
        )}
        {indicator === 'macd' && (
          <>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-blue-500" />DIF
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-amber-500" />DEA
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-1 bg-red-500" />MACD柱
            </span>
          </>
        )}
        {indicator === 'volume' && (
          <>
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 bg-red-500" />上涨
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 bg-green-500" />下跌
            </span>
          </>
        )}
      </div>
    </div>
  );
}
