import { API_BASE_URL } from '@/config';

export interface UserConfig {
  id: number;
  userId: number;
  b1JValueThreshold: number;
  b1MacdCondition: string;
  b1VolumeRatio: string;
  b1RedGreenCondition: boolean;
  s1WhiteLineBreak: boolean;
  s1LongYangFly: boolean;
  s1JValueHigh: number;
  s1VolumeCondition: boolean;
  watchlistStocks: string | null;
  excludedIndustries: string | null;
  backtestPool: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigUpdateInput {
  b1JValueThreshold?: number;
  b1MacdCondition?: string;
  b1VolumeRatio?: string;
  b1RedGreenCondition?: boolean;
  s1WhiteLineBreak?: boolean;
  s1LongYangFly?: boolean;
  s1JValueHigh?: number;
  s1VolumeCondition?: boolean;
  watchlistStocks?: string;
  excludedIndustries?: string;
}

export const configService = {
  async get(): Promise<UserConfig> {
    const response = await fetch(`${API_BASE_URL}/config-tags/list`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch config');
    return response.json();
  },

  async update(input: ConfigUpdateInput): Promise<{ success: boolean; updated: number }> {
    const response = await fetch(`${API_BASE_URL}/config-tags/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error('Failed to update config');
    return response.json();
  },

  async getBacktestPool(): Promise<string[]> {
    const stored = localStorage.getItem('backtestPool');
    return stored ? JSON.parse(stored) : [];
  },

  async saveBacktestPool(codes: string[]): Promise<{ success: boolean }> {
    localStorage.setItem('backtestPool', JSON.stringify(codes));
    return { success: true };
  },
};
