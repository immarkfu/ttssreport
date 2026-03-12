import { API_BASE_URL } from '@/config';

/** 从 localStorage 读取 token 并构造 Authorization header */
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  if (!token || token === 'guest_token') return {};
  return { Authorization: `Bearer ${token}` };
}

/** 后端返回的标签格式（对齐 _row_to_tag 输出） */
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
  isFilter: boolean;
  thresholdValue: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagInput {
  name: string;
  meaning?: string;
  calculationLogic?: string;
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
  /** 获取当前用户的标签列表（含系统标签） */
  async list(params?: { strategyType?: string; category?: string }): Promise<ConfigTag[]> {
    const searchParams = new URLSearchParams();
    if (params?.strategyType) searchParams.append('strategyType', params.strategyType);
    if (params?.category) searchParams.append('category', params.category);
    const url = `${API_BASE_URL}/config-tags/list${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await fetch(url, {
      headers: { ...authHeaders() },
    });
    if (!response.ok) throw new Error('获取标签列表失败');
    const data = await response.json();
    return Array.isArray(data) ? data : (data.data ?? []);
  },

  /** 创建自定义标签 */
  async create(input: CreateTagInput): Promise<ConfigTag> {
    const response = await fetch(`${API_BASE_URL}/config-tags/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).detail ?? '创建标签失败');
    }
    const data = await response.json();
    return (data as any).data ?? data;
  },

  /** 更新标签（使用 PUT RESTful 接口） */
  async update(input: UpdateTagInput): Promise<ConfigTag> {
    const { id, ...rest } = input;
    // 映射为后端 snake_case 字段
    const body: Record<string, unknown> = {};
    if (rest.name !== undefined) body.tag_name = rest.name;
    if (rest.meaning !== undefined) body.tag_meaning = rest.meaning;
    if (rest.calculationLogic !== undefined) body.calculation_logic = rest.calculationLogic;
    if (rest.category !== undefined) body.category = rest.category;
    if (rest.strategyType !== undefined) body.strategy_type = rest.strategyType;
    if (rest.sortOrder !== undefined) body.sort_order = rest.sortOrder;
    if (rest.isEnabled !== undefined) body.is_enabled = rest.isEnabled;

    const response = await fetch(`${API_BASE_URL}/config-tags/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).detail ?? '更新标签失败');
    }
    const data = await response.json();
    return (data as any).data ?? data;
  },

  /** 删除标签 */
  async delete(id: number): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/config-tags/${id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).detail ?? '删除标签失败');
    }
    return response.json();
  },

  /** 切换标签启用/禁用 */
  async toggleEnabled(id: number, isEnabled: boolean): Promise<ConfigTag> {
    return this.update({ id, isEnabled });
  },

  /** 批量重排序 */
  async reorder(tagIds: number[]): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/config-tags/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ tagIds }),
    });
    if (!response.ok) throw new Error('重排序失败');
    return response.json();
  },
};
