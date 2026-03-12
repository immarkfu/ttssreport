/**
 * 仪表盘概览组件
 * 设计风格：功能主义 - 市场全景数据展示
 * 支持卡片下钻：今日B1 -> B1观察页面，持仓卖出预警 -> S1卖出页面
 * 大盘走势：基于 bak_daily_data 全市场涨跌统计（无上证指数数据）
 */

import { useMarketOverview, useSignalDistribution, useMarketTrend } from '@/api/market';
import StatCard from './StatCard';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

interface DashboardOverviewProps {
  onNavigate?: (tab: string) => void;
}

export default function DashboardOverview({ onNavigate }: DashboardOverviewProps) {
  // 使用真实API获取数据
  const { data: marketOverview, isLoading: isLoadingOverview, error: overviewError } = useMarketOverview();
  const { data: signalDistribution, isLoading: isLoadingDistribution } = useSignalDistribution();
  const { data: marketTrend, isLoading: isLoadingTrend } = useMarketTrend(30);

  // 信号强度分布数据（使用真实数据或默认值）
  const signalData = [
    { name: '强信号', value: signalDistribution?.strong || 0, color: '#22C55E' },
    { name: '中信号', value: signalDistribution?.medium || 0, color: '#F59E0B' },
    { name: '观察池', value: Math.min(signalDistribution?.pool || 0, 100), color: '#94A3B8' },
  ];

  const handleB1Click = () => {
    onNavigate?.('b1-signals');
  };

  const handleS1Click = () => {
    onNavigate?.('s1-signals');
  };

  // 使用默认值或真实数据
  const overview = marketOverview || {
    activeMarketCap: '0',
    marketSentiment: '加载中...',
    sentimentChange: 0,
    todayB1Count: 0,
    monitorPoolCount: 0,
    b1Condition: 'J值<13 & MACD>0',
    b1Triggered: 0,
    b1Total: 0,
    s1Triggered: 0,
    s1Total: 0,
    sellWarningCount: 0,
    sellCondition: '跌破白线/长放飞',
    yesterdayWinRate: 0,
    winRateCondition: '次日涨幅 > 1%'
  };

  const distribution = signalDistribution || {
    strong: 0,
    medium: 0,
    pool: 0
  };

  // 格式化日期显示（YYYYMMDD -> MM/DD）
  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.length < 8) return dateStr;
    return `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
  };

  const trendData = (marketTrend?.data || []).map(d => ({
    date: formatDate(d.trade_date),
    涨家数: d.up_count,
    跌家数: -d.down_count,  // 负值让柱状图向下
    平均涨跌幅: d.avg_pct,
  }));

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-xl font-semibold">市场全景概览</h2>
        <p className="text-sm text-muted-foreground mt-1">
          基于量化模型的市场信号分析
        </p>
      </div>

      {/* 错误提示 */}
      {(overviewError || isLoadingOverview) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          {isLoadingOverview ? '正在加载市场数据...' : '数据加载失败，请刷新重试'}
        </div>
      )}

      {/* 统计卡片网格 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="当日活跃市值"
          value={overview.activeMarketCap}
          subtitle={`市场情绪${overview.marketSentiment}`}
          change={overview.sentimentChange}
          icon={Activity}
          variant="default"
        />
        <StatCard
          title="今日B1触发"
          value={`${overview.todayB1Count}/${overview.monitorPoolCount}`}
          subtitle={overview.b1Condition}
          icon={TrendingUp}
          variant="success"
          clickable
          onClick={handleB1Click}
        />
        <StatCard
          title="持仓卖出预警"
          value={overview.sellWarningCount}
          subtitle={overview.sellCondition}
          icon={TrendingDown}
          variant="danger"
          clickable
          onClick={handleS1Click}
        />
        <StatCard
          title="昨日观察胜率"
          value={`${overview.yesterdayWinRate}%`}
          subtitle={overview.winRateCondition}
          icon={Target}
          variant="success"
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 大盘涨跌趋势图（替代无数据的上证指数K线） */}
        <div className="col-span-2 bg-card rounded-lg border border-border/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium">全市场涨跌趋势</h3>
              <p className="text-xs text-muted-foreground mt-0.5">近30个交易日 · 涨跌家数 + 平均涨跌幅</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />涨家数</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />跌家数</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />平均涨跌幅%</span>
            </div>
          </div>

          <div className="h-[400px]">
            {isLoadingTrend ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">加载中...</div>
            ) : trendData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">暂无数据</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === '跌家数') return [`${Math.abs(value)}家`, name];
                      if (name === '平均涨跌幅') return [`${value}%`, name];
                      return [`${value}家`, name];
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="涨家数" fill="#22C55E" opacity={0.8} />
                  <Bar yAxisId="left" dataKey="跌家数" fill="#F87171" opacity={0.8} />
                  <Line yAxisId="right" type="monotone" dataKey="平均涨跌幅" stroke="#60A5FA" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 右侧分析面板 */}
        <div className="space-y-4">
          {/* 信号强度分布 */}
          <div className="bg-card rounded-lg border border-border/50 p-5">
            <h3 className="font-medium text-sm mb-3">今日B1信号全景分析</h3>
            <p className="text-xs text-muted-foreground mb-4">强度分布 (Signal Intensity)</p>

            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={signalData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {signalData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}只`, '']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  强信号
                </span>
                <span className="font-mono font-medium text-emerald-600">{distribution.strong}只</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  中信号
                </span>
                <span className="font-mono font-medium text-amber-600">{distribution.medium}只</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  观察池/排除
                </span>
                <span className="font-mono text-muted-foreground">{distribution.pool}+</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 合规声明 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-amber-600 text-xs font-bold">!</span>
          </div>
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">风险提示与免责声明</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              本平台所展示的数据和分析结果仅供参考，不构成任何投资建议。股市有风险，投资需谨慎。
              历史数据不代表未来表现，任何投资决策请自行判断并承担相应风险。
              本平台不对因使用本数据而产生的任何损失承担责任。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
