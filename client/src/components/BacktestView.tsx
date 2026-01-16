/**
 * 回测分析视图组件
 * 设计风格：功能主义 - 数据驱动的分析展示
 */

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { Calendar, TrendingUp, Target, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// 模拟回测数据
const backtestData = {
  summary: {
    totalTrades: 156,
    winRate: 68.5,
    avgReturn: 3.2,
    maxDrawdown: -8.5,
    sharpeRatio: 1.85,
    profitFactor: 2.1,
  },
  monthlyReturns: [
    { month: '2025-07', return: 5.2, trades: 12 },
    { month: '2025-08', return: -2.1, trades: 15 },
    { month: '2025-09', return: 8.5, trades: 18 },
    { month: '2025-10', return: 3.8, trades: 14 },
    { month: '2025-11', return: 6.2, trades: 16 },
    { month: '2025-12', return: 4.5, trades: 13 },
    { month: '2026-01', return: 2.8, trades: 8 },
  ],
  equityCurve: Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    equity: 100000 + Math.random() * 20000 + i * 500,
    benchmark: 100000 + Math.random() * 10000 + i * 200,
  })),
  winDistribution: [
    { range: '-5%以下', count: 5 },
    { range: '-5%~-2%', count: 12 },
    { range: '-2%~0%', count: 18 },
    { range: '0%~2%', count: 25 },
    { range: '2%~5%', count: 45 },
    { range: '5%~10%', count: 35 },
    { range: '10%以上', count: 16 },
  ],
};

export default function BacktestView() {
  const [dateRange, setDateRange] = useState('6m');

  const handleExport = () => {
    toast.info('功能开发中', {
      description: '回测报告导出功能即将上线',
    });
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">B1观察点回测分析</h2>
          <p className="text-sm text-muted-foreground mt-1">
            基于历史数据的策略表现评估
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            {['1m', '3m', '6m', '1y'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  dateRange === range
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {range === '1m' ? '1个月' : range === '3m' ? '3个月' : range === '6m' ? '6个月' : '1年'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            导出报告
          </Button>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-6 gap-4">
        <div className="bg-card rounded-lg border border-border/50 p-4">
          <p className="text-xs text-muted-foreground">总交易次数</p>
          <p className="text-2xl font-semibold mt-1">{backtestData.summary.totalTrades}</p>
        </div>
        <div className="bg-card rounded-lg border border-border/50 p-4">
          <p className="text-xs text-muted-foreground">胜率</p>
          <p className="text-2xl font-semibold mt-1 text-emerald-600">
            {backtestData.summary.winRate}%
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border/50 p-4">
          <p className="text-xs text-muted-foreground">平均收益</p>
          <p className="text-2xl font-semibold mt-1 text-emerald-600">
            +{backtestData.summary.avgReturn}%
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border/50 p-4">
          <p className="text-xs text-muted-foreground">最大回撤</p>
          <p className="text-2xl font-semibold mt-1 text-red-500">
            {backtestData.summary.maxDrawdown}%
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border/50 p-4">
          <p className="text-xs text-muted-foreground">夏普比率</p>
          <p className="text-2xl font-semibold mt-1">{backtestData.summary.sharpeRatio}</p>
        </div>
        <div className="bg-card rounded-lg border border-border/50 p-4">
          <p className="text-xs text-muted-foreground">盈亏比</p>
          <p className="text-2xl font-semibold mt-1">{backtestData.summary.profitFactor}</p>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 权益曲线 */}
        <div className="bg-card rounded-lg border border-border/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium">权益曲线</h3>
              <p className="text-xs text-muted-foreground mt-0.5">策略 vs 基准</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-500" />策略
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-400" />基准
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={backtestData.equityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`¥${value.toLocaleString()}`, '']}
                />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke="#22C55E"
                  strokeWidth={2}
                  dot={false}
                  name="策略"
                />
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  stroke="#94A3B8"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="5 5"
                  name="基准"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 收益分布 */}
        <div className="bg-card rounded-lg border border-border/50 p-5">
          <div className="mb-4">
            <h3 className="font-medium">收益分布</h3>
            <p className="text-xs text-muted-foreground mt-0.5">单笔交易收益率分布</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={backtestData.winDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value}笔`, '交易数']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {backtestData.winDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.range.includes('-') ? '#EF4444' : '#22C55E'}
                      opacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 月度收益表格 */}
      <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h3 className="font-medium">月度收益明细</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>月份</th>
                <th className="text-right">交易次数</th>
                <th className="text-right">月度收益</th>
                <th>收益条</th>
              </tr>
            </thead>
            <tbody>
              {backtestData.monthlyReturns.map((item) => (
                <tr key={item.month}>
                  <td className="font-mono">{item.month}</td>
                  <td className="text-right">{item.trades}笔</td>
                  <td className={`text-right font-mono font-medium ${
                    item.return >= 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {item.return >= 0 ? '+' : ''}{item.return}%
                  </td>
                  <td className="w-40">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.return >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                          style={{
                            width: `${Math.min(Math.abs(item.return) * 10, 100)}%`,
                            marginLeft: item.return < 0 ? 'auto' : 0,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 合规声明 */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
        <p>
          <strong>回测说明：</strong>
          以上回测结果基于历史数据模拟计算，不代表实际交易表现。
          回测未考虑交易成本、滑点、流动性等因素，实际收益可能与回测结果存在差异。
          过往业绩不代表未来表现，投资有风险，决策需谨慎。
        </p>
      </div>
    </div>
  );
}
