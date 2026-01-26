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
  userId: number;
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

async function getCurrentUserId(): Promise<number> {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    if (user && user.id) {
      return user.id;
    }
  }
  throw new Error('用户未登录');
}

export const configService = {
  async get(): Promise<UserConfig> {
    const userId = await getCurrentUserId();
    const response = await fetch(`${API_BASE_URL}/config-tags/list?user_id=${userId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to fetch config');
    }
    return response.json();
  },

  async update(input: Omit<ConfigUpdateInput, 'userId'>): Promise<{ success: boolean; updated: number }> {
    const userId = await getCurrentUserId();
    const response = await fetch(`${API_BASE_URL}/config-tags/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...input, userId }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to update config');
    }
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
