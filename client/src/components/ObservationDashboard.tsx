/**
 * 观察分析看板 - 显示观察池股票的表现统计和胜率分析
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import KLineChart from '@/components/charts/KLineChart';
import { generateKLineData } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface ObservationStock {
  code: string;
  name: string;
  industry: string;
  addedDate: string;
  addedPrice: number;
  performance5d: number | null;
  performance10d: number | null;
  performance20d: number | null;
  displayFactors: string[]; // 展示要素数组
}

// 模拟数据
const mockObservationStocks: ObservationStock[] = [
  {
    code: '600519',
    name: '贵州茅台',
    industry: '白酒',
    addedDate: '2026-01-10',
    addedPrice: 1662.50,
    performance5d: 1.53,
    performance10d: null,
    performance20d: null,
    displayFactors: ['J<13', 'MACD>0', '红肥绿瘦', '量比>1.0'],
  },
  {
    code: '000858',
    name: '五粮液',
    industry: '白酒',
    addedDate: '2026-01-10',
    addedPrice: 139.08,
    performance5d: 2.36,
    performance10d: null,
    performance20d: null,
    displayFactors: ['J<10', 'MACD>0', '红肥绿瘦'],
  },
];

type Period = 5 | 10 | 20;
const PAGE_SIZE = 10;

interface ObservationDashboardProps {
  backtestPool: Set<string>;
}

export default function ObservationDashboard({ backtestPool }: ObservationDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(5);
  const [selectedStock, setSelectedStock] = useState<ObservationStock | null>(
    mockObservationStocks[0] || null
  );
  // 仅显示加入观察池的股票
  const observationStocks = mockObservationStocks.filter(stock => backtestPool.has(stock.code));
  const [stocks] = useState<ObservationStock[]>(observationStocks);
  const [currentPage, setCurrentPage] = useState(1);

  // 分页逻辑
  const totalPages = Math.ceil(stocks.length / PAGE_SIZE);
  const paginatedStocks = stocks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // 计算胜率
  const calculateWinRate = (period: Period) => {
    const validStocks = stocks.filter(s => {
      const perf = period === 5 ? s.performance5d : period === 10 ? s.performance10d : s.performance20d;
      return perf !== null;
    });
    
    if (validStocks.length === 0) return 0;
    
    const winCount = validStocks.filter(s => {
      const perf = period === 5 ? s.performance5d : period === 10 ? s.performance10d : s.performance20d;
      return perf! > 0;
    }).length;
    
    return (winCount / validStocks.length) * 100;
  };

  // 按行业统计胜率
  const calculateIndustryWinRate = (period: Period) => {
    const industryMap = new Map<string, { total: number; win: number }>();
    
    stocks.forEach(s => {
      const perf = period === 5 ? s.performance5d : period === 10 ? s.performance10d : s.performance20d;
      if (perf === null) return;
      
      if (!industryMap.has(s.industry)) {
        industryMap.set(s.industry, { total: 0, win: 0 });
      }
      
      const stats = industryMap.get(s.industry)!;
      stats.total++;
      if (perf > 0) stats.win++;
    });
    
    return Array.from(industryMap.entries()).map(([industry, stats]) => ({
      industry,
      winRate: (stats.win / stats.total) * 100,
      total: stats.total,
    }));
  };

  const overallWinRate = calculateWinRate(selectedPeriod);
  const industryWinRates = calculateIndustryWinRate(selectedPeriod);

  // 获取胜率颜色
  const getWinRateColor = (rate: number) => {
    if (rate > 60) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (rate >= 40) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  // 格式化表现数据
  const formatPerformance = (perf: number | null) => {
    if (perf === null) return <span className="text-muted-foreground text-sm">数据不足</span>;
    const color = perf > 0 ? 'text-red-600' : 'text-emerald-600';
    const icon = perf > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
    return (
      <span className={`${color} font-medium flex items-center gap-1`}>
        {icon}
        {perf > 0 ? '+' : ''}{perf.toFixed(2)}%
      </span>
    );
  };

  // 展示要素标签样式
  const getDisplayFactorBadge = (factor: string) => {
    let style = 'bg-blue-50 text-blue-700 border-blue-200';
    if (factor.includes('J<') || factor.includes('J>')) {
      style = 'bg-purple-50 text-purple-700 border-purple-200';
    } else if (factor.includes('跌破') || factor.includes('放飞')) {
      style = 'bg-red-50 text-red-600 border-red-200';
    } else if (factor.includes('红肥绿瘦')) {
      style = 'bg-orange-50 text-orange-700 border-orange-200';
    } else if (factor.includes('量比')) {
      style = 'bg-cyan-50 text-cyan-700 border-cyan-200';
    }
    return (
      <Badge variant="outline" className={cn('text-xs font-normal whitespace-nowrap', style)}>
        {factor}
      </Badge>
    );
  };

  // 处理移出操作
  const handleRemove = (code: string) => {
    if (confirm(`确认要将 ${code} 移出观察池吗？`)) {
      // TODO: 调用API移出股票
      console.log('Remove stock:', code);
    }
  };

  return (
    <div className="space-y-6">
      {/* 风险提示 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          数据仅供参考，不构成投资建议。历史表现不代表未来收益。
        </p>
      </div>

      {/* 周期切换 */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-foreground">统计周期:</span>
        <div className="flex gap-2">
          {[5, 10, 20].map(period => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period as Period)}
            >
              {period} 日
            </Button>
          ))}
        </div>
      </div>

      {/* 胜率统计看板 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 总体胜率 */}
        <div className={`rounded-lg border-2 p-4 ${getWinRateColor(overallWinRate)}`}>
          <div className="text-xs font-medium mb-1">{selectedPeriod}日总体胜率</div>
          <div className="text-2xl font-bold">{overallWinRate.toFixed(1)}%</div>
          <div className="text-xs mt-1 opacity-75">
            样本数: {stocks.filter(s => {
              const perf = selectedPeriod === 5 ? s.performance5d : selectedPeriod === 10 ? s.performance10d : s.performance20d;
              return perf !== null;
            }).length} 只
          </div>
        </div>

        {/* 行业胜率 */}
        {industryWinRates.slice(0, 2).map(({ industry, winRate, total }) => (
          <div key={industry} className={`rounded-lg border-2 p-4 ${getWinRateColor(winRate)}`}>
            <div className="text-xs font-medium mb-1">{industry}</div>
            <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            <div className="text-xs mt-1 opacity-75">样本数: {total} 只</div>
          </div>
        ))}
      </div>

      {/* 观察池股票列表 + K线图 */}
      <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-6">
        {/* 左侧：股票列表 */}
        <div className="bg-card rounded-lg border border-border overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">个人观察股票池</h3>
            <p className="text-sm text-muted-foreground mt-1">
              共 {stocks.length} 只股票 · 点击查看K线走势
            </p>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="p-2 font-medium">代码</th>
                  <th className="p-2 font-medium">名称</th>
                  <th className="p-2 font-medium">行业</th>
                  <th className="p-2 font-medium">纳入日期</th>
                  <th className="p-2 font-medium">5日表现</th>
                  <th className="p-2 font-medium">10日表现</th>
                  <th className="p-2 font-medium">20日表现</th>
                  <th className="p-2 font-medium">展示要素</th>
                  <th className="p-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStocks.map(stock => (
                  <tr
                    key={stock.code}
                    className={`border-t border-border hover:bg-muted/30 cursor-pointer transition-colors ${
                      selectedStock?.code === stock.code ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedStock(stock)}
                  >
                    <td className="p-2 font-mono text-xs">{stock.code}</td>
                    <td className="p-2 font-medium text-sm">{stock.name}</td>
                    <td className="p-2 text-xs text-muted-foreground">{stock.industry}</td>
                    <td className="p-2 text-xs">{stock.addedDate}</td>
                    <td className="p-2 text-xs">{formatPerformance(stock.performance5d)}</td>
                    <td className="p-2 text-xs">{formatPerformance(stock.performance10d)}</td>
                    <td className="p-2 text-xs">{formatPerformance(stock.performance20d)}</td>
                    <td className="p-2">
                      <div className="grid grid-cols-4 gap-1">
                        {stock.displayFactors.map((factor, idx) => (
                          <div key={idx}>{getDisplayFactorBadge(factor)}</div>
                        ))}
                      </div>
                    </td>
                    <td className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(stock.code);
                        }}
                      >
                        移出
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页控制 */}
          {totalPages > 1 && (
            <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                第 {currentPage} / {totalPages} 页
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：K线图 */}
        <div className="bg-card rounded-lg border border-border p-4">
          {selectedStock ? (
            <>
              <div className="mb-4">
                <h3 className="font-semibold text-foreground">
                  {selectedStock.code} {selectedStock.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  纳入日期: {selectedStock.addedDate} · 纳入价格: ¥{selectedStock.addedPrice.toFixed(2)}
                </p>
              </div>
              
              <KLineChart
                stockCode={selectedStock.code}
                stockName={selectedStock.name}
                data={generateKLineData(selectedStock.addedPrice)}
                entryDate={selectedStock.addedDate}
              />
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              请选择股票查看K线图
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
