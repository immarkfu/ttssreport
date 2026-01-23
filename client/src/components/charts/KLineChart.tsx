/**
 * K线图组件 - 使用 lightweight-charts v5
 * 布局：主图 + 成交量 + KDJ（重点体现J值）
 * 设计风格：功能主义 - 白色底色，清晰的数据展示
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
import { KLineData, calculateKDJ } from '@/data/mockData';

interface KLineChartProps {
  data: KLineData[];
  stockName?: string;
  stockCode?: string;
  entryDate?: string;
  kdjValues?: { j: number; k: number; d: number };
}

export default function KLineChart({ data, stockName, stockCode, entryDate, kdjValues: propsKdjValues }: KLineChartProps) {
  const mainChartRef = useRef<HTMLDivElement>(null);
  const volumeChartRef = useRef<HTMLDivElement>(null);
  const kdjChartRef = useRef<HTMLDivElement>(null);
  const mainChart = useRef<IChartApi | null>(null);
  const volumeChart = useRef<IChartApi | null>(null);
  const kdjChart = useRef<IChartApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [kdjValues, setKdjValues] = useState<{ k: number; d: number; j: number } | null>(null);

  useEffect(() => {
    if (!mainChartRef.current || !volumeChartRef.current || !kdjChartRef.current || data.length === 0) return;

    setIsLoading(true);

    // 清理旧图表
    if (mainChart.current) {
      mainChart.current.remove();
      mainChart.current = null;
    }
    if (volumeChart.current) {
      volumeChart.current.remove();
      volumeChart.current = null;
    }
    if (kdjChart.current) {
      kdjChart.current.remove();
      kdjChart.current = null;
    }

    // 图表通用配置 - 白色底色
    const chartOptions = {
      layout: {
        background: { type: ColorType.Solid, color: '#FFFFFF' },
        textColor: '#333333',
        fontFamily: "'Inter', 'Noto Sans SC', sans-serif",
      },
      grid: {
        vertLines: { color: '#E5E5E5', style: 1 as const },
        horzLines: { color: '#E5E5E5', style: 1 as const },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#666666',
          width: 1 as const,
          style: 2 as const,
          labelBackgroundColor: '#333333',
        },
        horzLine: {
          color: '#666666',
          width: 1 as const,
          style: 2 as const,
          labelBackgroundColor: '#333333',
        },
      },
      timeScale: {
        borderColor: '#CCCCCC',
        timeVisible: true,
        secondsVisible: false,
        visible: false, // 只在最后一个图表显示时间轴
      },
      rightPriceScale: {
        borderColor: '#CCCCCC',
      },
    };

    // 创建主图表 (K线 + 均线)
    mainChart.current = createChart(mainChartRef.current, {
      ...chartOptions,
      width: mainChartRef.current.clientWidth,
      height: 200,
    });

    // 添加K线系列
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

    // 添加均线 (MA5, MA10, MA20)
    const ma5Series = mainChart.current.addSeries(LineSeries, {
      color: '#FFFFFF',
      lineWidth: 1,
      title: 'MA5',
    });
    const ma10Series = mainChart.current.addSeries(LineSeries, {
      color: '#F59E0B',
      lineWidth: 1,
      title: 'MA10',
    });

    // 计算均线
    const calculateMA = (period: number) => {
      return data.map((d, i) => {
        if (i < period - 1) return { time: d.time, value: NaN };
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, item) => acc + item.close, 0);
        return { time: d.time, value: sum / period };
      }).filter(d => !isNaN(d.value));
    };

    ma5Series.setData(calculateMA(5));
    ma10Series.setData(calculateMA(10));

    // 如果有纳入日期，在K线图上添加蓝色圆点标记
    if (entryDate) {
      // 找到纳入日期对应的数据点
      const entryTimestamp = new Date(entryDate).getTime() / 1000;
      const entryPoint = data.find(d => {
        const dataTime = typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time;
        return Math.abs(dataTime - entryTimestamp) < 86400; // 允许24小时的误差
      });
      
      if (entryPoint) {
        // 使用createPriceLine添加标记线
        candlestickSeries.createPriceLine({
          price: entryPoint.close,
          color: '#3B82F6',
          lineWidth: 1,
          lineStyle: 2, // dashed
          axisLabelVisible: true,
          title: `纳入: ${entryDate}`,
        });
      }
    }

    // 创建成交量图表
    volumeChart.current = createChart(volumeChartRef.current, {
      ...chartOptions,
      width: volumeChartRef.current.clientWidth,
      height: 80,
    });

    const volumeSeries = volumeChart.current.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
      },
    });

    volumeSeries.setData(data.map((d, i) => ({
      time: d.time,
      value: d.volume,
      color: i > 0 && d.close >= data[i - 1].close ? '#DC2626' : '#22C55E',
    })));

    // 创建KDJ图表
    kdjChart.current = createChart(kdjChartRef.current, {
      ...chartOptions,
      width: kdjChartRef.current.clientWidth,
      height: 100,
      timeScale: {
        ...chartOptions.timeScale,
        visible: true, // 只在KDJ图表显示时间轴
      },
    });

    const kdjData = calculateKDJ(data);

    // K线 - 蓝色
    const kSeries = kdjChart.current.addSeries(LineSeries, {
      color: '#3B82F6',
      lineWidth: 1,
      title: 'K',
    });
    // D线 - 黄色
    const dSeries = kdjChart.current.addSeries(LineSeries, {
      color: '#F59E0B',
      lineWidth: 1,
      title: 'D',
    });
    // J线 - 紫色，加粗突出显示
    const jSeries = kdjChart.current.addSeries(LineSeries, {
      color: '#8B5CF6',
      lineWidth: 2,
      title: 'J',
    });

    kSeries.setData(kdjData.map(d => ({ time: d.time, value: d.k! })));
    dSeries.setData(kdjData.map(d => ({ time: d.time, value: d.d! })));
    jSeries.setData(kdjData.map(d => ({ time: d.time, value: d.j! })));

    // 设置最新KDJ值（优先使用传入的真实值）
    if (propsKdjValues) {
      setKdjValues({
        k: Math.round(propsKdjValues.k * 100) / 100,
        d: Math.round(propsKdjValues.d * 100) / 100,
        j: Math.round(propsKdjValues.j * 100) / 100,
      });
    } else if (kdjData.length > 0) {
      const latest = kdjData[kdjData.length - 1];
      setKdjValues({
        k: Math.round(latest.k! * 100) / 100,
        d: Math.round(latest.d! * 100) / 100,
        j: Math.round(latest.j! * 100) / 100,
      });
    }

    // 同步三个图表的时间轴
    const syncTimeScales = () => {
      mainChart.current?.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (range) {
          volumeChart.current?.timeScale().setVisibleLogicalRange(range);
          kdjChart.current?.timeScale().setVisibleLogicalRange(range);
        }
      });

      volumeChart.current?.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (range) {
          mainChart.current?.timeScale().setVisibleLogicalRange(range);
          kdjChart.current?.timeScale().setVisibleLogicalRange(range);
        }
      });

      kdjChart.current?.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (range) {
          mainChart.current?.timeScale().setVisibleLogicalRange(range);
          volumeChart.current?.timeScale().setVisibleLogicalRange(range);
        }
      });
    };

    syncTimeScales();

    // 自适应宽度
    mainChart.current.timeScale().fitContent();
    volumeChart.current.timeScale().fitContent();
    kdjChart.current.timeScale().fitContent();

    setIsLoading(false);

    // 响应式调整
    const handleResize = () => {
      if (mainChartRef.current && mainChart.current) {
        mainChart.current.applyOptions({ width: mainChartRef.current.clientWidth });
      }
      if (volumeChartRef.current && volumeChart.current) {
        volumeChart.current.applyOptions({ width: volumeChartRef.current.clientWidth });
      }
      if (kdjChartRef.current && kdjChart.current) {
        kdjChart.current.applyOptions({ width: kdjChartRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mainChart.current) {
        mainChart.current.remove();
        mainChart.current = null;
      }
      if (volumeChart.current) {
        volumeChart.current.remove();
        volumeChart.current = null;
      }
      if (kdjChart.current) {
        kdjChart.current.remove();
        kdjChart.current = null;
      }
    };
  }, [data]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 图表头部 */}
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {stockCode && stockName ? (
              <>
                <span className="font-mono text-sm text-gray-600">{stockCode}</span>
                <span className="font-medium text-gray-900">{stockName}</span>
              </>
            ) : (
              <span className="text-gray-500">请选择股票查看K线</span>
            )}
          </div>
          <span className="text-xs text-gray-500">日K线</span>
        </div>
      </div>

      {/* K线主图 */}
      <div className="relative border-b border-gray-100">
        {isLoading && data.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div className="px-1 py-1 text-xs text-gray-500 flex items-center gap-3">
          <span>主图</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-white border border-gray-300" />MA5
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-amber-500" />MA10
          </span>
        </div>
        <div ref={mainChartRef} className="w-full" style={{ height: 200 }} />
      </div>

      {/* 成交量图 */}
      <div className="border-b border-gray-100">
        <div className="px-1 py-1 text-xs text-gray-500 flex items-center gap-3">
          <span>VOL</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500" />涨
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500" />跌
          </span>
        </div>
        <div ref={volumeChartRef} className="w-full" style={{ height: 80 }} />
      </div>

      {/* KDJ指标图 */}
      <div>
        <div className="px-1 py-1 text-xs text-gray-500 flex items-center gap-3">
          <span>KDJ(9,3,3)</span>
          {kdjValues && (
            <>
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-blue-500" />K: <span className="text-blue-600">{kdjValues.k}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-amber-500" />D: <span className="text-amber-600">{kdjValues.d}</span>
              </span>
              <span className="flex items-center gap-1 font-medium">
                <span className="w-2 h-1 bg-purple-500" />J: <span className="text-purple-600">{kdjValues.j}</span>
              </span>
            </>
          )}
        </div>
        <div ref={kdjChartRef} className="w-full" style={{ height: 100 }} />
      </div>
    </div>
  );
}
