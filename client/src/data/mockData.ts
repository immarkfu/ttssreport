/**
 * 模拟股票数据 - 用于展示
 * 数据来源：模拟数据，仅供参考
 */

export interface StockSignal {
  id: string;
  code: string;
  name: string;
  industry: string;
  signalType: 'B1' | 'S1';
  signalStrength: 'strong' | 'medium' | 'weak';
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  triggerTime: string;
  triggerCondition: string;
  displayFactor: string; // 展示要素：如 J<13、红肥绿瘦
}

export interface KLineData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorData {
  time: string;
  k?: number;
  d?: number;
  j?: number;
  macd?: number;
  signal?: number;
  histogram?: number;
  volume?: number;
}

// 生成模拟K线数据
export function generateKLineData(basePrice: number = 15, days: number = 60): KLineData[] {
  const data: KLineData[] = [];
  let currentPrice = basePrice;
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // 跳过周末
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const volatility = 0.03;
    const change = (Math.random() - 0.48) * volatility * currentPrice;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.015);
    const low = Math.min(open, close) * (1 - Math.random() * 0.015);
    const volume = Math.floor(Math.random() * 5000000 + 1000000);
    
    data.push({
      time: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });
    
    currentPrice = close;
  }
  
  return data;
}

// 计算KDJ指标
export function calculateKDJ(klineData: KLineData[], n: number = 9): IndicatorData[] {
  const result: IndicatorData[] = [];
  let prevK = 50;
  let prevD = 50;
  
  for (let i = 0; i < klineData.length; i++) {
    const start = Math.max(0, i - n + 1);
    const slice = klineData.slice(start, i + 1);
    
    const highestHigh = Math.max(...slice.map(d => d.high));
    const lowestLow = Math.min(...slice.map(d => d.low));
    const close = klineData[i].close;
    
    const rsv = highestHigh === lowestLow ? 50 : ((close - lowestLow) / (highestHigh - lowestLow)) * 100;
    const k = (2 / 3) * prevK + (1 / 3) * rsv;
    const d = (2 / 3) * prevD + (1 / 3) * k;
    const j = 3 * k - 2 * d;
    
    result.push({
      time: klineData[i].time,
      k: parseFloat(k.toFixed(2)),
      d: parseFloat(d.toFixed(2)),
      j: parseFloat(j.toFixed(2)),
    });
    
    prevK = k;
    prevD = d;
  }
  
  return result;
}

// 计算MACD指标
export function calculateMACD(klineData: KLineData[], short: number = 12, long: number = 26, signal: number = 9): IndicatorData[] {
  const result: IndicatorData[] = [];
  const closes = klineData.map(d => d.close);
  
  // 计算EMA
  const emaShort = calculateEMA(closes, short);
  const emaLong = calculateEMA(closes, long);
  
  // 计算DIF (MACD线)
  const dif: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    dif.push(emaShort[i] - emaLong[i]);
  }
  
  // 计算DEA (信号线)
  const dea = calculateEMA(dif, signal);
  
  // 计算柱状图
  for (let i = 0; i < klineData.length; i++) {
    result.push({
      time: klineData[i].time,
      macd: parseFloat(dif[i].toFixed(4)),
      signal: parseFloat(dea[i].toFixed(4)),
      histogram: parseFloat(((dif[i] - dea[i]) * 2).toFixed(4)),
    });
  }
  
  return result;
}

function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // 第一个值使用SMA
  let sum = 0;
  for (let i = 0; i < Math.min(period, data.length); i++) {
    sum += data[i];
  }
  result[0] = sum / Math.min(period, data.length);
  
  // 后续使用EMA公式
  for (let i = 1; i < data.length; i++) {
    result[i] = (data[i] - result[i - 1]) * multiplier + result[i - 1];
  }
  
  return result;
}

// B1买入信号列表 - 模拟数据
export const b1SignalList: StockSignal[] = [
  {
    id: '1',
    code: '600519',
    name: '贵州茅台',
    industry: '白酒',
    signalType: 'B1',
    signalStrength: 'strong',
    price: 1688.00,
    change: 25.50,
    changePercent: 1.53,
    volume: 2580000,
    triggerTime: '2026-01-16 09:45',
    triggerCondition: 'J值<13 & MACD>0',
    displayFactor: 'J<13',
  },
  {
    id: '2',
    code: '000858',
    name: '五粮液',
    industry: '白酒',
    signalType: 'B1',
    signalStrength: 'strong',
    price: 142.35,
    change: 3.28,
    changePercent: 2.36,
    volume: 4120000,
    triggerTime: '2026-01-16 10:15',
    triggerCondition: 'J值<13 & MACD>0',
    displayFactor: 'J<13',
  },
  {
    id: '3',
    code: '300750',
    name: '宁德时代',
    industry: '新能源',
    signalType: 'B1',
    signalStrength: 'medium',
    price: 185.60,
    change: -2.40,
    changePercent: -1.28,
    volume: 8560000,
    triggerTime: '2026-01-16 10:30',
    triggerCondition: 'J值<20 & MACD>0',
    displayFactor: 'J<20',
  },
  {
    id: '4',
    code: '002475',
    name: '立讯精密',
    industry: '消费电子',
    signalType: 'B1',
    signalStrength: 'medium',
    price: 32.85,
    change: 0.65,
    changePercent: 2.02,
    volume: 12500000,
    triggerTime: '2026-01-16 11:00',
    triggerCondition: 'J值<20 & MACD>0',
    displayFactor: '红肥绿瘦',
  },
  {
    id: '5',
    code: '601318',
    name: '中国平安',
    industry: '保险',
    signalType: 'B1',
    signalStrength: 'weak',
    price: 45.20,
    change: 0.35,
    changePercent: 0.78,
    volume: 15800000,
    triggerTime: '2026-01-16 13:30',
    triggerCondition: 'J值<25 & MACD>0',
    displayFactor: 'J<25',
  },
  {
    id: '6',
    code: '000001',
    name: '平安银行',
    industry: '银行',
    signalType: 'B1',
    signalStrength: 'weak',
    price: 11.85,
    change: 0.12,
    changePercent: 1.02,
    volume: 28500000,
    triggerTime: '2026-01-16 14:00',
    triggerCondition: 'J值<25 & MACD>0',
    displayFactor: '量比>1.5',
  },
];

// S1卖出信号列表 - 模拟数据
export const s1SignalList: StockSignal[] = [
  {
    id: '1',
    code: '002594',
    name: '比亚迪',
    industry: '新能源汽车',
    signalType: 'S1',
    signalStrength: 'strong',
    price: 268.50,
    change: -8.50,
    changePercent: -3.07,
    volume: 6850000,
    triggerTime: '2026-01-16 09:35',
    triggerCondition: '跌破白线 & 放量',
    displayFactor: '跌破白线',
  },
  {
    id: '2',
    code: '600036',
    name: '招商银行',
    industry: '银行',
    signalType: 'S1',
    signalStrength: 'medium',
    price: 32.15,
    change: -0.85,
    changePercent: -2.57,
    volume: 18500000,
    triggerTime: '2026-01-16 10:20',
    triggerCondition: '长阳放飞',
    displayFactor: '长阳放飞',
  },
  {
    id: '3',
    code: '601012',
    name: '隆基绿能',
    industry: '光伏',
    signalType: 'S1',
    signalStrength: 'strong',
    price: 22.35,
    change: -1.15,
    changePercent: -4.89,
    volume: 25600000,
    triggerTime: '2026-01-16 11:15',
    triggerCondition: '跌破白线 & 放量',
    displayFactor: '跌破白线',
  },
  {
    id: '4',
    code: '000725',
    name: '京东方A',
    industry: '面板',
    signalType: 'S1',
    signalStrength: 'weak',
    price: 4.25,
    change: -0.08,
    changePercent: -1.85,
    volume: 85000000,
    triggerTime: '2026-01-16 13:45',
    triggerCondition: 'J值>85',
    displayFactor: 'J>85',
  },
  {
    id: '5',
    code: '002415',
    name: '海康威视',
    industry: '安防',
    signalType: 'S1',
    signalStrength: 'medium',
    price: 28.60,
    change: -0.95,
    changePercent: -3.22,
    volume: 12800000,
    triggerTime: '2026-01-16 14:15',
    triggerCondition: '长阳放飞',
    displayFactor: '红肥绿瘦',
  },
];

// 市场概览数据
export const marketOverview = {
  activeMarketCap: '1.26万亿',
  marketSentiment: '正常',
  sentimentChange: 2.85,
  todayB1Count: 26,
  b1Condition: 'J值<13 & MACD>0',
  sellWarningCount: 7,
  sellCondition: '跌破白线/长阳放飞',
  yesterdayWinRate: 84,
  winRateCondition: '次日涨幅 > 1%',
  monitorPoolCount: 4821,
  dataSource: '实时数据',
};

// 行业分布数据
export const industryDistribution = [
  { name: '半导体', value: 28, color: '#22C55E' },
  { name: '新能源汽车', value: 22, color: '#F59E0B' },
  { name: '消费电子', value: 18, color: '#3B82F6' },
  { name: '生物医药', value: 15, color: '#EF4444' },
  { name: '金融地产', value: 12, color: '#8B5CF6' },
  { name: '其他', value: 5, color: '#6B7280' },
];

// 信号强度分布
export const signalDistribution = {
  strong: 15,
  medium: 11,
  pool: 4800,
};

// 为每只股票生成K线数据的映射
export const stockKLineDataMap: Record<string, KLineData[]> = {};

// 初始化所有股票的K线数据
[...b1SignalList, ...s1SignalList].forEach(stock => {
  const basePrice = stock.price * (0.85 + Math.random() * 0.3);
  stockKLineDataMap[stock.code] = generateKLineData(basePrice, 60);
});
