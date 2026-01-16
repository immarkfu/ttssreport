/**
 * 信号列表表格组件
 * 设计风格：功能主义 - 数据表格清晰展示，支持点击联动
 * 表头：代码、名称、现价、涨跌幅、强度、展示要素
 */

import { cn } from '@/lib/utils';
import { StockSignal } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SignalTableProps {
  signals: StockSignal[];
  selectedId: string | null;
  onSelect: (signal: StockSignal) => void;
  type: 'B1' | 'S1';
}

export default function SignalTable({ signals, selectedId, onSelect, type }: SignalTableProps) {
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
    // 根据展示要素类型显示不同颜色
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

  return (
    <div className="bg-card rounded-lg border border-border/50 overflow-hidden h-full flex flex-col">
      {/* 表头 */}
      <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
        <h3 className="font-medium text-sm">
          {type === 'B1' ? '观察信号列表' : '卖出信号列表'}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          点击查看详细K线走势
        </p>
      </div>

      {/* 表格内容 */}
      <ScrollArea className="flex-1">
        <table className="data-table">
          <thead className="sticky top-0 bg-card z-10">
            <tr>
              <th className="w-20">代码</th>
              <th className="w-24">名称</th>
              <th className="w-20 text-right">现价</th>
              <th className="w-20 text-right">涨跌幅</th>
              <th className="w-14 text-center">强度</th>
              <th className="w-24 text-center">展示要素</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((signal) => (
              <tr
                key={signal.id}
                onClick={() => onSelect(signal)}
                className={cn(
                  'cursor-pointer transition-smooth',
                  selectedId === signal.id && 'selected bg-sidebar-accent'
                )}
              >
                <td className="font-mono text-sm">{signal.code}</td>
                <td>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{signal.name}</span>
                    <span className="text-xs text-muted-foreground">{signal.industry}</span>
                  </div>
                </td>
                <td className="text-right font-mono text-sm">{signal.price.toFixed(2)}</td>
                <td className={cn(
                  'text-right font-mono font-medium text-sm',
                  signal.changePercent >= 0 ? 'text-red-500' : 'text-emerald-500'
                )}>
                  {signal.changePercent >= 0 ? '+' : ''}{signal.changePercent.toFixed(2)}%
                </td>
                <td className="text-center">{getStrengthBadge(signal.signalStrength)}</td>
                <td className="text-center">{getDisplayFactorBadge(signal.displayFactor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      {/* 底部统计 */}
      <div className="px-4 py-2 border-t border-border/50 bg-muted/30 text-xs text-muted-foreground">
        共 {signals.length} 只股票
      </div>
    </div>
  );
}
