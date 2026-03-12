import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/config';
import { useLocation } from 'wouter';

function authHeaders(token: string | null): Record<string, string> {
  if (!token || token === 'guest_token') return {};
  return { Authorization: `Bearer ${token}` };
}

interface DailyTrend {
  date: string;
  active_users: number;
  page_views: number;
  unique_visitors: number;
}

interface PageVisit {
  page_path: string;
  visits: number;
  unique_visitors: number;
}

interface AnalyticsStats {
  total_users: number;
  active_users: number;
  total_pv: number;
  total_uv: number;
  new_users: number;
  daily_trend: DailyTrend[];
  page_visits: PageVisit[];
  date_range: number;
}

interface UserItem {
  id: number;
  phone: string;
  username: string | null;
  role: string;
  status: string;
  created_at: string;
  watchlist_count: number;
}

interface HotStock {
  ts_code: string;
  stock_name: string;
  watch_count: number;
  latest_pct_change: number | null;
  latest_price: number | null;
}

interface UserStat {
  user_id: number;
  username: string | null;
  phone: string;
  total_stocks: number;
  profit_count: number;
  loss_count: number;
  avg_pct_change: number | null;
}

type Tab = 'overview' | 'users' | 'watchlist';

export default function Admin() {
  const { token, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>('overview');
  const [dateRange, setDateRange] = useState(7);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [hotStocks, setHotStocks] = useState<HotStock[]>([]);
  const [userStats, setUserStats] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [tab, dateRange, token]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'overview') {
        const res = await fetch(`${API_BASE_URL}/admin/stats?date_range=${dateRange}`, {
          headers: authHeaders(token),
        });
        if (!res.ok) throw new Error('获取统计数据失败');
        setStats(await res.json());
      } else if (tab === 'users') {
        const res = await fetch(`${API_BASE_URL}/admin/users/list?limit=100`, {
          headers: authHeaders(token),
        });
        if (!res.ok) throw new Error('获取用户列表失败');
        const data = await res.json();
        setUsers(data.data ?? []);
      } else if (tab === 'watchlist') {
        const res = await fetch(`${API_BASE_URL}/admin/watchlist/performance?date_range=${dateRange}`, {
          headers: authHeaders(token),
        });
        if (!res.ok) throw new Error('获取观察池统计失败');
        const data = await res.json();
        setHotStocks(data.hot_stocks ?? []);
        setUserStats(data.user_stats ?? []);
      }
    } catch (e: any) {
      setError(e.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">超级管理员后台</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">统计周期：</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
          >
            <option value={7}>近 7 天</option>
            <option value={14}>近 14 天</option>
            <option value={30}>近 30 天</option>
          </select>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 mb-6 border-b">
        {([
          { key: 'overview', label: 'PV/UV 概览' },
          { key: 'users', label: '用户管理' },
          { key: 'watchlist', label: '观察池表现' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">加载中...</div>
      ) : (
        <>
          {/* PV/UV 概览 */}
          {tab === 'overview' && stats && (
            <div>
              {/* 核心指标卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <MetricCard label="总用户数" value={stats.total_users} />
                <MetricCard label="活跃用户" value={stats.active_users} sub={`近${dateRange}天`} />
                <MetricCard label="总 PV" value={stats.total_pv} sub={`近${dateRange}天`} />
                <MetricCard label="总 UV" value={stats.total_uv} sub={`近${dateRange}天`} />
                <MetricCard label="新增用户" value={stats.new_users} sub={`近${dateRange}天`} />
              </div>

              {/* 每日趋势表格 */}
              <div className="mb-8">
                <h2 className="text-base font-semibold mb-3">每日访问趋势</h2>
                {stats.daily_trend.length === 0 ? (
                  <p className="text-gray-400 text-sm">暂无访问数据</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left p-3 font-medium text-gray-600">日期</th>
                          <th className="text-right p-3 font-medium text-gray-600">PV（页面浏览）</th>
                          <th className="text-right p-3 font-medium text-gray-600">UV（独立访客）</th>
                          <th className="text-right p-3 font-medium text-gray-600">活跃登录用户</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.daily_trend.map((d) => (
                          <tr key={d.date} className="border-b hover:bg-gray-50">
                            <td className="p-3">{d.date}</td>
                            <td className="p-3 text-right">{d.page_views}</td>
                            <td className="p-3 text-right">{d.unique_visitors}</td>
                            <td className="p-3 text-right">{d.active_users}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 页面访问分布 */}
              <div>
                <h2 className="text-base font-semibold mb-3">页面访问分布 Top 20</h2>
                {stats.page_visits.length === 0 ? (
                  <p className="text-gray-400 text-sm">暂无数据</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left p-3 font-medium text-gray-600">页面路径</th>
                          <th className="text-right p-3 font-medium text-gray-600">访问次数</th>
                          <th className="text-right p-3 font-medium text-gray-600">独立访客</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.page_visits.map((p, i) => (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-mono text-xs">{p.page_path}</td>
                            <td className="p-3 text-right">{p.visits}</td>
                            <td className="p-3 text-right">{p.unique_visitors}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 用户管理 */}
          {tab === 'users' && (
            <div>
              <p className="text-sm text-gray-500 mb-4">共 {users.length} 名用户</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left p-3 font-medium text-gray-600">ID</th>
                      <th className="text-left p-3 font-medium text-gray-600">手机号</th>
                      <th className="text-left p-3 font-medium text-gray-600">用户名</th>
                      <th className="text-left p-3 font-medium text-gray-600">角色</th>
                      <th className="text-left p-3 font-medium text-gray-600">状态</th>
                      <th className="text-right p-3 font-medium text-gray-600">观察池</th>
                      <th className="text-left p-3 font-medium text-gray-600">注册时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-gray-400">{u.id}</td>
                        <td className="p-3 font-mono">{u.phone}</td>
                        <td className="p-3">{u.username || '--'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {u.role === 'admin' ? '超管' : '普通用户'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            u.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {u.status === 'active' ? '正常' : u.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">{u.watchlist_count}</td>
                        <td className="p-3 text-gray-400 text-xs">
                          {u.created_at ? String(u.created_at).slice(0, 10) : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 观察池表现 */}
          {tab === 'watchlist' && (
            <div className="space-y-8">
              {/* 热门股票 */}
              <div>
                <h2 className="text-base font-semibold mb-3">全平台热门观察股票 Top 20</h2>
                {hotStocks.length === 0 ? (
                  <p className="text-gray-400 text-sm">暂无数据</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left p-3 font-medium text-gray-600">代码</th>
                          <th className="text-left p-3 font-medium text-gray-600">名称</th>
                          <th className="text-right p-3 font-medium text-gray-600">关注人数</th>
                          <th className="text-right p-3 font-medium text-gray-600">最新价格</th>
                          <th className="text-right p-3 font-medium text-gray-600">最新涨跌幅</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hotStocks.map((s, i) => (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-mono text-blue-600">{s.ts_code}</td>
                            <td className="p-3">{s.stock_name || '--'}</td>
                            <td className="p-3 text-right font-medium">{s.watch_count}</td>
                            <td className="p-3 text-right">
                              {s.latest_price != null ? s.latest_price.toFixed(2) : '--'}
                            </td>
                            <td className={`p-3 text-right font-medium ${
                              s.latest_pct_change != null && s.latest_pct_change > 0
                                ? 'text-red-500'
                                : s.latest_pct_change != null && s.latest_pct_change < 0
                                ? 'text-green-600'
                                : 'text-gray-500'
                            }`}>
                              {s.latest_pct_change != null
                                ? `${s.latest_pct_change > 0 ? '+' : ''}${s.latest_pct_change.toFixed(2)}%`
                                : '--'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 各用户观察池表现 */}
              <div>
                <h2 className="text-base font-semibold mb-3">各用户观察池表现</h2>
                {userStats.length === 0 ? (
                  <p className="text-gray-400 text-sm">暂无数据</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left p-3 font-medium text-gray-600">用户</th>
                          <th className="text-right p-3 font-medium text-gray-600">观察股票数</th>
                          <th className="text-right p-3 font-medium text-gray-600">盈利</th>
                          <th className="text-right p-3 font-medium text-gray-600">亏损</th>
                          <th className="text-right p-3 font-medium text-gray-600">平均涨跌幅</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userStats.map((u) => (
                          <tr key={u.user_id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <div className="font-medium">{u.username || '未设置'}</div>
                              <div className="text-xs text-gray-400 font-mono">{u.phone}</div>
                            </td>
                            <td className="p-3 text-right">{u.total_stocks}</td>
                            <td className="p-3 text-right text-red-500">{u.profit_count ?? 0}</td>
                            <td className="p-3 text-right text-green-600">{u.loss_count ?? 0}</td>
                            <td className={`p-3 text-right font-medium ${
                              u.avg_pct_change != null && u.avg_pct_change > 0
                                ? 'text-red-500'
                                : u.avg_pct_change != null && u.avg_pct_change < 0
                                ? 'text-green-600'
                                : 'text-gray-500'
                            }`}>
                              {u.avg_pct_change != null
                                ? `${u.avg_pct_change > 0 ? '+' : ''}${u.avg_pct_change}%`
                                : '--'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
