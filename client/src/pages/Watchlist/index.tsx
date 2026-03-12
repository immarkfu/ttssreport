import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/config';

interface WatchlistItem {
  id: number;
  ts_code: string;
  stock_name: string;
  note: string | null;
  is_active: number;
  created_at: string;
  latest_trade_date: string | null;
  latest_close: number | null;
  latest_pct_change: number | null;
  latest_tag_score: number | null;
  latest_tags: string[];
}

interface PerformanceSummary {
  total_stocks: number;
  profit_count: number;
  loss_count: number;
  flat_count: number;
  avg_pct_change: number | null;
  latest_trade_date: string | null;
}

function authHeaders(token: string | null): Record<string, string> {
  if (!token || token === 'guest_token') return {};
  return { Authorization: `Bearer ${token}` };
}

export default function Watchlist() {
  const { token, isGuest } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editNote, setEditNote] = useState<{ id: number; ts_code: string; note: string } | null>(null);
  const [noteInput, setNoteInput] = useState('');

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, perfRes] = await Promise.all([
        fetch(`${API_BASE_URL}/watchlist/list`, { headers: authHeaders(token) }),
        fetch(`${API_BASE_URL}/watchlist/performance`, { headers: authHeaders(token) }),
      ]);
      if (!listRes.ok) throw new Error('获取观察池失败');
      const listData = await listRes.json();
      setItems(listData.data ?? []);

      if (perfRes.ok) {
        const perfData = await perfRes.json();
        setSummary(perfData.summary ?? null);
      }
    } catch (e: any) {
      setError(e.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isGuest) fetchList();
    else setLoading(false);
  }, [token]);

  const handleRemove = async (ts_code: string) => {
    if (!confirm(`确认将 ${ts_code} 移出观察池？`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/watchlist/remove?ts_code=${encodeURIComponent(ts_code)}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error('移除失败');
      fetchList();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSaveNote = async () => {
    if (!editNote) return;
    try {
      const res = await fetch(`${API_BASE_URL}/watchlist/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ ts_code: editNote.ts_code, note: noteInput }),
      });
      if (!res.ok) throw new Error('更新失败');
      setEditNote(null);
      fetchList();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (isGuest) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg mb-2">观察池功能需要登录后使用</p>
        <a href="/login" className="text-blue-500 underline">前往登录</a>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">我的观察池</h1>

      {/* 统计概览 */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="观察股票" value={summary.total_stocks} unit="只" />
          <StatCard label="上涨" value={summary.profit_count} unit="只" color="text-red-500" />
          <StatCard label="下跌" value={summary.loss_count} unit="只" color="text-green-600" />
          <StatCard label="平盘" value={summary.flat_count} unit="只" />
          <StatCard
            label="平均涨跌"
            value={summary.avg_pct_change != null ? `${summary.avg_pct_change > 0 ? '+' : ''}${summary.avg_pct_change}%` : '--'}
            color={summary.avg_pct_change != null && summary.avg_pct_change > 0 ? 'text-red-500' : 'text-green-600'}
          />
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* 加载中 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">观察池为空</p>
          <p className="text-sm">可在 B1 信号列表中将感兴趣的股票加入观察池</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-3 font-medium text-gray-600">代码</th>
                <th className="text-left p-3 font-medium text-gray-600">名称</th>
                <th className="text-right p-3 font-medium text-gray-600">最新收盘</th>
                <th className="text-right p-3 font-medium text-gray-600">涨跌幅</th>
                <th className="text-right p-3 font-medium text-gray-600">标签得分</th>
                <th className="text-left p-3 font-medium text-gray-600">最新标签</th>
                <th className="text-left p-3 font-medium text-gray-600">备注</th>
                <th className="text-left p-3 font-medium text-gray-600">加入时间</th>
                <th className="text-center p-3 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-mono text-blue-600">{item.ts_code}</td>
                  <td className="p-3 font-medium">{item.stock_name || '--'}</td>
                  <td className="p-3 text-right">
                    {item.latest_close != null ? item.latest_close.toFixed(2) : '--'}
                  </td>
                  <td className={`p-3 text-right font-medium ${
                    item.latest_pct_change != null && item.latest_pct_change > 0
                      ? 'text-red-500'
                      : item.latest_pct_change != null && item.latest_pct_change < 0
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}>
                    {item.latest_pct_change != null
                      ? `${item.latest_pct_change > 0 ? '+' : ''}${item.latest_pct_change.toFixed(2)}%`
                      : '--'}
                  </td>
                  <td className="p-3 text-right">
                    {item.latest_tag_score != null ? item.latest_tag_score : '--'}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(item.latest_tags) && item.latest_tags.length > 0
                        ? item.latest_tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                              {tag}
                            </span>
                          ))
                        : <span className="text-gray-400 text-xs">--</span>
                      }
                    </div>
                  </td>
                  <td className="p-3 text-gray-500 max-w-32 truncate">
                    {item.note || '--'}
                  </td>
                  <td className="p-3 text-gray-400 text-xs">
                    {item.created_at ? item.created_at.slice(0, 10) : '--'}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          setEditNote({ id: item.id, ts_code: item.ts_code, note: item.note ?? '' });
                          setNoteInput(item.note ?? '');
                        }}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        备注
                      </button>
                      <button
                        onClick={() => handleRemove(item.ts_code)}
                        className="text-xs text-red-400 hover:underline"
                      >
                        移除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 编辑备注弹窗 */}
      {editNote && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="font-semibold mb-3">编辑备注 - {editNote.ts_code}</h3>
            <textarea
              className="w-full border rounded p-2 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="输入备注..."
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setEditNote(null)}
                className="px-4 py-1.5 text-sm border rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveNote}
                className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number | string;
  unit?: string;
  color?: string;
}) {
  return (
    <div className="bg-white border rounded-lg p-4 text-center shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color ?? 'text-gray-800'}`}>
        {value}
        {unit && <span className="text-sm font-normal text-gray-500 ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}
