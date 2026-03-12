import { useQuery } from '@tanstack/react-query';
const API_BASE = import.meta.env.VITE_API_BASE || '';

export interface MarketOverview {
  activeMarketCap: string;
  marketSentiment: string;
  sentimentChange: number;
  todayB1Count: number;
  monitorPoolCount: number;
  b1Condition: string;
  b1Triggered: number;
  b1Total: number;
  s1Triggered: number;
  s1Total: number;
  sellWarningCount: number;
  sellCondition: string;
  yesterdayWinRate: number;
  winRateCondition: string;
}

export interface SignalDistribution {
  strong: number;
  medium: number;
  pool: number;
}

export const useMarketOverview = () => {
  return useQuery<MarketOverview>({
    queryKey: ['marketOverview'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/market/overview`);
      if (!res.ok) throw new Error('Failed to fetch market overview');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    refetchInterval: 5 * 60 * 1000, // 5分钟自动刷新
  });
};

export interface MarketTrendDay {
  trade_date: string;
  up_count: number;
  down_count: number;
  flat_count: number;
  avg_pct: number;
  total_amount_yi: number;
}

export const useMarketTrend = (days = 30) => {
  return useQuery<{ data: MarketTrendDay[]; days: number }>({
    queryKey: ['marketTrend', days],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/market/market-trend?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch market trend');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

export const useSignalDistribution = () => {
  return useQuery<SignalDistribution>({
    queryKey: ['signalDistribution'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/market/signal-distribution`);
      if (!res.ok) throw new Error('Failed to fetch signal distribution');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};
