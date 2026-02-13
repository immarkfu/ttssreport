import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

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
      const response = await axios.get(`${API_BASE}/api/v1/market/overview`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    refetchInterval: 5 * 60 * 1000, // 5分钟自动刷新
  });
};

export const useSignalDistribution = () => {
  return useQuery<SignalDistribution>({
    queryKey: ['signalDistribution'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/api/v1/market/signal-distribution`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};
