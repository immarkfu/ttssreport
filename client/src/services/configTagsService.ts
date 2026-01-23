import { API_BASE_URL } from '@/config';

export interface ConfigTag {
  id: number;
  name: string;
  meaning: string;
  calculationLogic: string;
  category: 'plus' | 'minus';
  tagType: 'system' | 'custom';
  strategyType: string;
  sortOrder: number;
  isEnabled: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagInput {
  name: string;
  meaning: string;
  calculationLogic: string;
  category: 'plus' | 'minus';
  strategyType: string;
  sortOrder?: number;
}

export interface UpdateTagInput {
  id: number;
  name?: string;
  meaning?: string;
  calculationLogic?: string;
  category?: 'plus' | 'minus';
  strategyType?: string;
  sortOrder?: number;
  isEnabled?: boolean;
}

export const configTagsService = {
  async list(params?: { strategyType?: string; category?: string }): Promise<ConfigTag[]> {
    const searchParams = new URLSearchParams();
    if (params?.strategyType) searchParams.append('strategyType', params.strategyType);
    if (params?.category) searchParams.append('category', params.category);
    const url = `${API_BASE_URL}/config-tags/list${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch tags');
    return response.json();
  },

  async create(input: CreateTagInput): Promise<ConfigTag> {
    const response = await fetch(`${API_BASE_URL}/config-tags/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error('Failed to create tag');
    return response.json();
  },

  async update(input: UpdateTagInput): Promise<ConfigTag> {
    const response = await fetch(`${API_BASE_URL}/config-tags/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error('Failed to update tag');
    return response.json();
  },

  async delete(id: number): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/config-tags/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id }),
    });
    if (!response.ok) throw new Error('Failed to delete tag');
    return response.json();
  },

  async toggleEnabled(id: number, isEnabled: boolean): Promise<ConfigTag> {
    return this.update({ id, isEnabled });
  },

  async reorder(tagIds: number[]): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/config-tags/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tagIds }),
    });
    if (!response.ok) throw new Error('Failed to reorder tags');
    return response.json();
  },

  async validateLogic(calculationLogic: string): Promise<{ valid: boolean; errors: string[] }> {
    return { valid: true, errors: [] };
  },
};
