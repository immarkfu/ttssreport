/**
 * 仪表盘概览组件
 * 设计风格：功能主义 - 市场全景数据展示
 * 支持卡片下钻：今日B1 -> B1观察页面，持仓卖出预警 -> S1卖出页面
 * 新增：上证指数K线图（日K线+成交量+KDJ）
 */

import { useState, useEffect } from 'react';
import { generateKLineData } from '@/data/mockData';
import { useMarketOverview, useSignalDistribution } from '@/api/market';
import StatCard from './StatCard';
import KLineChart from './charts/KLineChart';
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
} from 'recharts';

interface DashboardOverviewProps {
  onNavigate?: (tab: string) => void;
}

export default function DashboardOverview({ onNavigate }: DashboardOverviewProps) {
  const [indexKLineData, setIndexKLineData] = useState<ReturnType<typeof generateKLineData>>([]);

  // 使用真实API获取数据
  const { data: marketOverview, isLoading: isLoadingOverview, error: overviewError } = useMarketOverview();
  const { data: signalDistribution, isLoading: isLoadingDistribution } = useSignalDistribution();

  // 生成上证指数K线数据（基准价格3000点左右）
  useEffect(() => {
    const data = generateKLineData(3000, 60);
    setIndexKLineData(data);
  }, []);

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
        {/* 上证指数K线图 */}
        <div className="col-span-2 bg-card rounded-lg border border-border/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium">上证指数大盘走势</h3>
              <p className="text-xs text-muted-foreground mt-0.5">日K线 + 成交量 + KDJ指标</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>近60个交易日</span>
            </div>
          </div>
          
          {/* K线图组件 */}
          <div className="h-[480px]">
            <KLineChart
              data={indexKLineData}
              stockName="上证指数"
              stockCode="000001"
            />
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
