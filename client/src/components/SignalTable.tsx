/**
 * 信号列表表格组件
 * 设计风格：功能主义 - 数据表格清晰展示
 * 功能：分页、排序、行业列、回测池复选框
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { StockSignal } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface SignalTableProps {
  signals: StockSignal[];
  selectedId: string | null;
  onSelect: (signal: StockSignal) => void;
  type: 'B1' | 'S1';
  backtestPool?: Set<string>;
  onBacktestPoolChange?: (code: string, checked: boolean) => void;
}

type SortField = 'code' | 'name' | 'industry' | 'price' | 'changePercent' | 'signalStrength' | 'displayFactor';
type SortDirection = 'asc' | 'desc' | null;

const PAGE_SIZE = 10;

export default function SignalTable({ 
  signals, 
  selectedId, 
  onSelect, 
  type,
  backtestPool = new Set(),
  onBacktestPoolChange
}: SignalTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // 排序逻辑
  const sortedSignals = useMemo(() => {
    if (!sortField || !sortDirection) return signals;

    return [...signals].sort((a, b) => {
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
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'changePercent':
          comparison = a.changePercent - b.changePercent;
          break;
        case 'signalStrength':
          const strengthOrder = { strong: 3, medium: 2, weak: 1 };
          comparison = strengthOrder[a.signalStrength] - strengthOrder[b.signalStrength];
          break;
        case 'displayFactor':
          comparison = a.displayFactor.localeCompare(b.displayFactor);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [signals, sortField, sortDirection]);

  // 分页逻辑
  const totalPages = Math.ceil(sortedSignals.length / PAGE_SIZE);
  const paginatedSignals = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedSignals.slice(start, start + PAGE_SIZE);
  }, [sortedSignals, currentPage]);

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

  const getStrengthBadge = (strength: string) => {
    const styles = {
      strong: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      medium: 'bg-amber-100 text-amber-700 border-amber-200',
      weak: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    const labels = {
      strong: '强',
      medium: '中',
      weak: '弱',
    };
    return (
      <Badge variant="outline" className={cn('text-xs font-normal', styles[strength as keyof typeof styles])}>
        {labels[strength as keyof typeof labels]}
      </Badge>
    );
  };

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

  // 表头样式
  const thClass = "px-2 py-2 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors select-none";

  return (
    <div className="bg-card rounded-lg border border-border/50 overflow-hidden h-full flex flex-col min-h-0">
      {/* 表头 */}
      <div className="px-4 py-2 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">
              {type === 'B1' ? '观察信号列表' : '卖出信号列表'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              点击查看详细K线走势，勾选后点击按钮加入观察
            </p>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            className="h-8 text-xs"
            onClick={() => {
              const checkedCodes = Array.from(backtestPool);
              if (checkedCodes.length === 0) {
                alert('请先勾选股票');
                return;
              }
              // TODO: 调用API将勾选的股票加入观察池
              alert(`已将 ${checkedCodes.length} 只股票加入观察池`);
            }}
          >
            加入观察
          </Button>
        </div>
      </div>

      {/* 表格内容 */}
      <ScrollArea className="flex-1 min-h-0">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200">
            <tr>
              <th className="w-8 px-1 py-2 text-center">
                <span className="text-xs text-gray-500">观察</span>
              </th>
              <th className={cn(thClass, "w-14 text-left")} onClick={() => handleSort('code')}>
                <div className="flex items-center gap-1">
                  代码 <SortIcon field="code" />
                </div>
              </th>
              <th className={cn(thClass, "w-20 text-left")} onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">
                  名称 <SortIcon field="name" />
                </div>
              </th>
              <th className={cn(thClass, "w-16 text-left")} onClick={() => handleSort('industry')}>
                <div className="flex items-center gap-1">
                  行业 <SortIcon field="industry" />
                </div>
              </th>
              <th className={cn(thClass, "w-16 text-right")} onClick={() => handleSort('price')}>
                <div className="flex items-center justify-end gap-1">
                  现价 <SortIcon field="price" />
                </div>
              </th>
              <th className={cn(thClass, "w-18 text-right")} onClick={() => handleSort('changePercent')}>
                <div className="flex items-center justify-end gap-1">
                  涨跌幅 <SortIcon field="changePercent" />
                </div>
              </th>
              <th className={cn(thClass, "w-12 text-center")} onClick={() => handleSort('signalStrength')}>
                <div className="flex items-center justify-center gap-1">
                  强度 <SortIcon field="signalStrength" />
                </div>
              </th>
              <th className={cn(thClass, "w-[140px] text-left")} onClick={() => handleSort('displayFactor')}>
                <div className="flex items-center gap-1">
                  展示要素 <SortIcon field="displayFactor" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedSignals.map((signal) => (
              <tr
                key={signal.id}
                onClick={() => onSelect(signal)}
                className={cn(
                  'cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-100 h-[67px]',
                  selectedId === signal.id && 'bg-primary/5 hover:bg-primary/10'
                )}
              >
                <td className="w-8 px-1 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={backtestPool.has(signal.code)}
                    onCheckedChange={(checked) => {
                      onBacktestPoolChange?.(signal.code, checked as boolean);
                    }}
                    className="data-[state=checked]:bg-primary"
                  />
                </td>
                <td className="w-14 px-1 py-2.5 font-mono text-xs text-gray-700">{signal.code}</td>
                <td className="w-20 px-1 py-2.5 font-medium text-sm text-gray-900 truncate" title={signal.name}>{signal.name}</td>
                <td className="w-16 px-1 py-2.5 text-xs text-gray-500 truncate" title={signal.industry}>{signal.industry}</td>
                <td className="w-16 px-1 py-2.5 text-right font-mono text-xs">{signal.price.toFixed(2)}</td>
                <td className={cn(
                  'w-18 px-1 py-2.5 text-right font-mono font-medium text-xs',
                  signal.changePercent >= 0 ? 'text-red-500' : 'text-emerald-500'
                )}>
                  {signal.changePercent >= 0 ? '+' : ''}{signal.changePercent.toFixed(2)}%
                </td>
                <td className="w-12 px-1 py-2.5 text-center">{getStrengthBadge(signal.signalStrength)}</td>
                <td className="w-[140px] px-1 py-2.5">
                  <div className="grid grid-cols-3 gap-0.5">
                    {signal.displayFactor.split(',').slice(0, 15).map((factor, idx) => (
                      <div key={idx}>{getDisplayFactorBadge(factor.trim())}</div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      {/* 底部分页 */}
      <div className="px-4 py-1.5 border-t border-border/50 bg-muted/30 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          共 {signals.length} 只股票 · 已选 {backtestPool.size} 只
        </div>
        
        {totalPages > 1 && (
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
            <span className="text-xs text-muted-foreground px-2">
              {currentPage} / {totalPages}
            </span>
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
        )}
      </div>
    </div>
  );
}
