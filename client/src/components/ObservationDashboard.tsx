/**
 * 个人观察统计池 - 显示观察池股票的表现统计和胜率分析
 */

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import KLineChart from '@/components/charts/KLineChart';
import { generateKLineData } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { b1SignalService, B1SignalResult } from '@/services/b1SignalService';

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

type Period = 5 | 10 | 20;
type SortField = 'code' | 'name' | 'industry' | 'addedDate' | 'performance5d' | 'performance10d' | 'performance20d';
type SortDirection = 'asc' | 'desc' | null;
const PAGE_SIZE = 10;

interface ObservationDashboardProps {
  backtestPool: Set<string>;
}

export default function ObservationDashboard({ backtestPool }: ObservationDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(5);
  const [selectedStock, setSelectedStock] = useState<ObservationStock | null>(null);
  const [stocks, setStocks] = useState<ObservationStock[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  useEffect(() => {
    const fetchB1Signals = async () => {
      try {
        setLoading(true);
        const response = await b1SignalService.getResults(undefined, undefined, 1, 20);
        
        const mappedStocks: ObservationStock[] = response.data.map((item: B1SignalResult) => ({
          code: item.ts_code.replace('.SH', '').replace('.SZ', ''),
          name: item.stock_name,
          industry: item.industry || '未知',
          addedDate: `${item.trade_date.slice(0, 4)}-${item.trade_date.slice(4, 6)}-${item.trade_date.slice(6, 8)}`,
          addedPrice: item.close_price,
          performance5d: null,
          performance10d: null,
          performance20d: null,
          displayFactors: item.display_factor.split(', '),
        }));
        
        setStocks(mappedStocks);
        if (mappedStocks.length > 0) {
          setSelectedStock(mappedStocks[0]);
        }
      } catch (error) {
        console.error('获取B1信号失败:', error);
        setStocks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchB1Signals();
  }, []);
  
  const filteredStocks = useMemo(() => {
    let result = backtestPool.size > 0
      ? stocks.filter(stock => backtestPool.has(stock.code))
      : stocks;

    return result;
  }, [stocks, backtestPool]);

  // 排序逻辑
  const sortedStocks = useMemo(() => {
    if (!sortField || !sortDirection) return filteredStocks;

    return [...filteredStocks].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'industry':
          comparison = a.industry.localeCompare(b.industry);
          break;
        case 'addedDate':
          comparison = new Date(a.addedDate).getTime() - new Date(b.addedDate).getTime();
          break;
        case 'performance5d':
        case 'performance10d':
        case 'performance20d':
          if (a[sortField] === null && b[sortField] === null) comparison = 0;
          else if (a[sortField] === null) comparison = 1;
          else if (b[sortField] === null) comparison = -1;
          else comparison = (a[sortField] as number) - (b[sortField] as number);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredStocks, sortField, sortDirection]);

  // 处理排序点击
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // 排序后回到第一页
  };

  // 排序图标
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-3 h-3 text-gray-400" />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUp className="w-3 h-3 text-primary" />;
    }
    return <ChevronDown className="w-3 h-3 text-primary" />;
  };

  // 分页逻辑
  const totalPages = Math.ceil(sortedStocks.length / PAGE_SIZE);
  const paginatedStocks = sortedStocks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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

  if (loading) {
    return <div className="flex items-center justify-center h-64">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 风险提示 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          数据仅供参考，不构成投资建议。历史表现不代表未来收益。
        </p>
      </div>

      {/* 观察池股票列表 + K线图 */}
      <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-6">
        {/* 左侧：股票列表 */}
        <div className="bg-card rounded-lg border border-border overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">个人观察股票池</h3>
            <p className="text-sm text-muted-foreground mt-1">
              共 {filteredStocks.length} 只股票 · 点击查看K线走势
            </p>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="p-2 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('code')}>
                    <div className="flex items-center gap-1">
                      代码 <SortIcon field="code" />
                    </div>
                  </th>
                  <th className="p-2 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">
                      名称 <SortIcon field="name" />
                    </div>
                  </th>
                  <th className="p-2 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('industry')}>
                    <div className="flex items-center gap-1">
                      行业 <SortIcon field="industry" />
                    </div>
                  </th>
                  <th className="p-2 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('addedDate')}>
                    <div className="flex items-center gap-1">
                      纳入日期 <SortIcon field="addedDate" />
                    </div>
                  </th>
                  <th className="p-2 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('performance5d')}>
                    <div className="flex items-center gap-1">
                      5日表现 <SortIcon field="performance5d" />
                    </div>
                  </th>
                  <th className="p-2 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('performance10d')}>
                    <div className="flex items-center gap-1">
                      10日表现 <SortIcon field="performance10d" />
                    </div>
                  </th>
                  <th className="p-2 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('performance20d')}>
                    <div className="flex items-center gap-1">
                      20日表现 <SortIcon field="performance20d" />
                    </div>
                  </th>
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