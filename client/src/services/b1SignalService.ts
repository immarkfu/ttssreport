import { API_BASE_URL } from '@/config';

export interface B1SignalResult {
  ts_code: string;
  stock_name: string;
  trade_date: string;
  signal_strength: string;
  close_price: number;
  open_price: number;
  high_price: number;
  low_price: number;
  price_change: number;
  pct_change: number;
  volume: number;
  amount: number;
  volume_ratio: number;
  turnover_rate: number;
  j_value: number;
  k_value: number;
  d_value: number;
  macd_dif: number;
  macd_dea: number;
  macd_value: number;
  total_mv: number;
  circ_mv: number;
  industry: string;
  area: string;
  display_factor: string;
  matched_tag_ids: number[];
  matched_tag_names: string[];
  plus_tags_count: number;
  minus_tags_count: number;
  tag_score: number;
  trigger_time: string;
}

export interface B1SignalResponse {
  success: boolean;
  total: number;
  data: B1SignalResult[];
}

export interface B1Tag {
  id: number;
  tag_name: string;
  tag_code: string;
  category: string;
  is_enabled: number;
  is_filter: number;
  threshold_value: number | null;
  sort_order: number;
}

export interface B1TagsResponse {
  success: boolean;
  data: B1Tag[];
}

export interface TagItem {
  id: number;
  tag_name: string;
  tag_code: string;
  strategy_type: string;
  category: string;
  is_enabled: number;
  threshold_value: number | null;
  sort_order: number;
  is_filter: number;
}

export interface TagsResponse {
  success: boolean;
  data: TagItem[];
}

export interface B1FilterAndTagResponse {
  success: boolean;
  message: string;
  total: number;
  saved: number;
  data: B1SignalResult[];
}

export const b1SignalService = {
  async getResults(
    tradeDate?: string,
    signalStrength?: string,
    limit: number = 100
  ): Promise<B1SignalResponse> {
    const params = new URLSearchParams();
    const effectiveDate = tradeDate || new Date().toISOString().split('T')[0];
    params.append('trade_date', effectiveDate);
    if (signalStrength) params.append('signal_strength', signalStrength);
    params.append('limit', limit.toString());

    const response = await fetch(`${API_BASE_URL}/b1-signal/results?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch B1 signal results');
    }
    return response.json();
  },

  async getConfigTags(): Promise<TagsResponse> {
    const response = await fetch(`${API_BASE_URL}/config-tags/list`);
    if (!response.ok) throw new Error('Failed to fetch tags');
    return response.json();
  },

  async saveConfigTag(id: number, thresholdValue: number | null, isUpdate: boolean): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/config-tags/tags/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, threshold_value: thresholdValue, is_update: isUpdate }),
    });
    if (!response.ok) throw new Error('Failed to save tag config');
    return response.json();
  },

  async filterAndTag(
    tradeDate: string,
    customTags?: string[],
    saveToDb: boolean = false,
    jThreshold?: number,
    macdDifThreshold?: number
  ): Promise<B1FilterAndTagResponse> {
    const response = await fetch(`${API_BASE_URL}/b1-signal/filter-and-tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trade_date: tradeDate,
        custom_tags: customTags,
        save_to_db: saveToDb,
        j_threshold: jThreshold,
        macd_dif_threshold: macdDifThreshold,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to filter and tag B1 signals');
    }
    return response.json();
  },

  async saveTagConfig(tagCodes: string[]): Promise<{ success: boolean; enabled_count: number }> {
    const response = await fetch(`${API_BASE_URL}/b1-signal/save-tag-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_codes: tagCodes }),
    });
    if (!response.ok) {
      throw new Error('Failed to save tag config');
    }
    return response.json();
  },

  async saveThreshold(tagCode: string, thresholdValue: number): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/b1-signal/save-threshold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_code: tagCode, threshold_value: thresholdValue }),
    });
    if (!response.ok) {
      throw new Error('Failed to save threshold');
    }
    return response.json();
  },
};
