/**
 * 仪表盘概览组件
 * 设计风格：功能主义 - 市场全景数据展示
 */

import { marketOverview, signalDistribution, industryDistribution } from '@/data/mockData';
import StatCard from './StatCard';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Database,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

export default function DashboardOverview() {
  // 信号强度分布数据
  const signalData = [
    { name: '强信号', value: signalDistribution.strong, color: '#22C55E' },
    { name: '中信号', value: signalDistribution.medium, color: '#F59E0B' },
    { name: '观察池', value: Math.min(signalDistribution.pool, 100), color: '#94A3B8' },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-xl font-semibold">市场全景概览</h2>
        <p className="text-sm text-muted-foreground mt-1">
          基于量化模型的市场信号分析
        </p>
      </div>

      {/* 统计卡片网格 */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          title="当日活跃市值"
          value={marketOverview.activeMarketCap}
          subtitle={`市场情绪${marketOverview.marketSentiment}`}
          change={marketOverview.sentimentChange}
          icon={Activity}
          variant="default"
        />
        <StatCard
          title="今日B1触发"
          value={marketOverview.todayB1Count}
          subtitle={marketOverview.b1Condition}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="持仓卖出预警"
          value={marketOverview.sellWarningCount}
          subtitle={marketOverview.sellCondition}
          icon={TrendingDown}
          variant="danger"
        />
        <StatCard
          title="昨日观察胜率"
          value={`${marketOverview.yesterdayWinRate}%`}
          subtitle={marketOverview.winRateCondition}
          icon={Target}
          variant="success"
        />
        <StatCard
          title="全市场监控池"
          value={marketOverview.monitorPoolCount.toLocaleString()}
          subtitle={marketOverview.dataSource}
          icon={Database}
          variant="default"
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 知行趋势指标模拟 */}
        <div className="col-span-2 bg-card rounded-lg border border-border/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium">知行趋势指标模拟</h3>
              <p className="text-xs text-muted-foreground mt-0.5">上证指数日K叠加</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-800" />白线(快)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-500 border-dashed" style={{ borderStyle: 'dashed' }} />黄线(慢)
              </span>
            </div>
          </div>
          
          {/* 简化的趋势图示意 */}
          <div className="h-64 flex items-end justify-between gap-1 px-4">
            {Array.from({ length: 30 }).map((_, i) => {
              const height = 40 + Math.sin(i * 0.3) * 20 + Math.random() * 30;
              const isUp = Math.random() > 0.45;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all hover:opacity-80"
                  style={{
                    height: `${height}%`,
                    backgroundColor: isUp ? '#DC2626' : '#22C55E',
                    minWidth: '8px',
                  }}
                />
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <span>2025-12-01</span>
            <span>数据区间: 近30个交易日</span>
            <span>2026-01-16</span>
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
                <span className="font-mono font-medium text-emerald-600">{signalDistribution.strong}只</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  中信号
                </span>
                <span className="font-mono font-medium text-amber-600">{signalDistribution.medium}只</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  观察池/排除
                </span>
                <span className="font-mono text-muted-foreground">{signalDistribution.pool}+</span>
              </div>
            </div>
          </div>

          {/* 行业板块分布 */}
          <div className="bg-card rounded-lg border border-border/50 p-5">
            <p className="text-xs text-muted-foreground mb-3">行业板块分布 (Industry Focus)</p>
            
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={industryDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={50}
                    dataKey="value"
                  >
                    {industryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, '']}
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

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 text-xs">
              {industryDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground truncate">{item.name}</span>
                </div>
              ))}
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
