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
  matched_tag_codes: string[];
  plus_tags_count: number;
  minus_tags_count: number;
  tag_score: number;
  trigger_time: string;
}

export interface B1SignalResponse {
  success: boolean;
  total: number;
  data: B1SignalResult[];
  page: number;
  page_size: number;
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

export interface StockKLine {
  time: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  pct_chg: number | null;
  volume: number | null;
}

export interface StockIndicator {
  time: string;
  ma5: number | null;
  ma10: number | null;
  volume: number | null;
  k: number | null;
  d: number | null;
  j: number | null;
}

export interface StockDetailResponse {
  success: boolean;
  data: {
    ts_code: string;
    kline: StockKLine[];
    indicators: StockIndicator[];
  } | null;
  message?: string;
}

export interface LatestTradeDateResponse {
  success: boolean;
  latest_trade_date: string | null;
  message?: string;
}

function getUserIdFromStorage(): number {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    if (user && user.id) {
      return user.id;
    }
  }
  throw new Error('用户未登录');
}

export const b1SignalService = {
  async getResults(
    tradeDate?: string,
    signalStrength?: string,
    page: number = 1,
    pageSize: number = 20,
    jValue?: number,
    matchedTagCodes?: string[]
  ): Promise<B1SignalResponse> {
    const params = new URLSearchParams();
    if (tradeDate) params.append('trade_date', tradeDate);
    if (signalStrength) params.append('signal_strength', signalStrength);
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    if (jValue !== undefined) params.append('j_value', jValue.toString());
    if (matchedTagCodes && matchedTagCodes.length > 0) {
      params.append('matched_tag_codes', matchedTagCodes.join(','));
    }

    const response = await fetch(`${API_BASE_URL}/b1-signal/results?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch B1 signal results');
    }
    return response.json();
  },

  async getConfigTags(): Promise<TagsResponse> {
    const userId = getUserIdFromStorage();
    const response = await fetch(`${API_BASE_URL}/config-tags/list?user_id=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch tags');
    return response.json();
  },

  async saveConfigTag(id: number, thresholdValue: number | null, isUpdate: boolean): Promise<{ success: boolean }> {
    const userId = getUserIdFromStorage();
    const response = await fetch(`${API_BASE_URL}/config-tags/tags/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, user_id: userId, threshold_value: thresholdValue, is_update: isUpdate }),
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
    const userId = getUserIdFromStorage();
    const response = await fetch(`${API_BASE_URL}/b1-signal/filter-and-tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trade_date: tradeDate,
        custom_tags: customTags,
        save_to_db: saveToDb,
        j_threshold: jThreshold,
        macd_dif_threshold: macdDifThreshold,
        user_id: userId,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to filter and tag B1 signals');
    }
    return response.json();
  },

  async saveTagConfig(tags: { id: number; is_enabled: number; threshold_value: number | null }[]): Promise<{ success: boolean }> {
    const userId = getUserIdFromStorage();
    const payload = { tags, user_id: userId };
    const response = await fetch(`${API_BASE_URL}/b1-signal/save-tag-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error('Failed to save tag config');
    }
    return response.json();
  },

  async saveThreshold(tagCode: string, thresholdValue: number): Promise<{ success: boolean }> {
    const userId = getUserIdFromStorage();
    const response = await fetch(`${API_BASE_URL}/b1-signal/save-threshold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_code: tagCode, threshold_value: thresholdValue, user_id: userId }),
    });
    if (!response.ok) {
      throw new Error('Failed to save threshold');
    }
    return response.json();
  },

  async getStockDetail(code: string): Promise<StockDetailResponse> {
    const response = await fetch(`${API_BASE_URL}/b1-signal/stock-detail?code=${encodeURIComponent(code)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch stock detail');
    }
    return response.json();
  },

  async getLatestTradeDate(): Promise<LatestTradeDateResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/latest-trade`);
    if (!response.ok) {
      throw new Error('Failed to fetch latest trade date');
    }
    return response.json();
  },
};
