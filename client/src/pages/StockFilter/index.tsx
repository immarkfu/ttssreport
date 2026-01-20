/**
 * 股票筛选页面
 * 基于配置标签进行股票筛选和排序
 */

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type StrategyType = 'B1' | 'S1';
type LogicType = 'AND' | 'OR';
type SortBy = 'tagCount' | 'tagScore' | 'pctChange';
type SortOrder = 'asc' | 'desc';

export default function StockFilterView() {
  // 状态管理
  const [strategyType, setStrategyType] = useState<StrategyType>('B1');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [logicType, setLogicType] = useState<LogicType>('AND');
  const [sortBy, setSortBy] = useState<SortBy>('tagScore');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // API查询
  const { data: tagsData, isLoading: tagsLoading } = trpc.stockFilter.getAvailableTags.useQuery({
    strategyType,
  });

  const { data: stocksData, isLoading: stocksLoading, refetch } = trpc.stockFilter.getFilteredStocks.useQuery({
    strategyType,
    tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    logicType,
    sortBy,
    sortOrder,
    page: currentPage,
    pageSize,
  });

  const { data: statisticsData } = trpc.stockFilter.getTagStatistics.useQuery({
    strategyType,
  });

  // 标签分类
  const plusTags = useMemo(() => tagsData?.filter(t => t.category === 'plus') || [], [tagsData]);
  const minusTags = useMemo(() => tagsData?.filter(t => t.category === 'minus') || [], [tagsData]);

  // 处理标签选择
  const handleTagToggle = (tagId: number) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
    setCurrentPage(1); // 重置到第一页
  };

  // 处理全选/取消全选
  const handleSelectAll = (category: 'plus' | 'minus') => {
    const tags = category === 'plus' ? plusTags : minusTags;
    const tagIds = tags.map(t => t.id);
    const allSelected = tagIds.every(id => selectedTagIds.includes(id));
    
    if (allSelected) {
      setSelectedTagIds(prev => prev.filter(id => !tagIds.includes(id)));
    } else {
      setSelectedTagIds(prev => [...new Set([...prev, ...tagIds])]);
    }
    setCurrentPage(1);
  };

  // 清空筛选
  const handleClearFilter = () => {
    setSelectedTagIds([]);
    setCurrentPage(1);
  };

  // 格式化涨跌幅
  const formatPctChange = (pct: number | null) => {
    if (pct === null) return '-';
    const color = pct > 0 ? 'text-red-600' : pct < 0 ? 'text-emerald-600' : 'text-gray-600';
    const icon = pct > 0 ? <TrendingUp className="w-3 h-3" /> : pct < 0 ? <TrendingDown className="w-3 h-3" /> : null;
    return (
      <span className={cn('flex items-center gap-1 font-medium', color)}>
        {icon}
        {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
      </span>
    );
  };

  // 获取标签Badge样式
  const getTagBadgeStyle = (tagName: string) => {
    let style = 'bg-blue-50 text-blue-700 border-blue-200';
    if (tagName.includes('J') || tagName.includes('B1')) {
      style = 'bg-purple-50 text-purple-700 border-purple-200';
    } else if (tagName.includes('MACD')) {
      style = 'bg-orange-50 text-orange-700 border-orange-200';
    } else if (tagName.includes('红肥绿瘦')) {
      style = 'bg-pink-50 text-pink-700 border-pink-200';
    } else if (tagName.includes('市值')) {
      style = 'bg-cyan-50 text-cyan-700 border-cyan-200';
    }
    return style;
  };

  return (
    <div className="flex h-full gap-4">
      {/* 左侧筛选面板 */}
      <Card className="w-80 p-4 overflow-y-auto flex-shrink-0">
        <div className="space-y-6">
          {/* 标题 */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold">股票筛选</h2>
          </div>

          {/* 战法选择 */}
          <div className="space-y-2">
            <Label>战法类型</Label>
            <Select value={strategyType} onValueChange={(v) => {
              setStrategyType(v as StrategyType);
              setSelectedTagIds([]);
              setCurrentPage(1);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="B1">B1买点</SelectItem>
                <SelectItem value="S1">S1卖点</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 筛选逻辑 */}
          <div className="space-y-2">
            <Label>筛选逻辑</Label>
            <Select value={logicType} onValueChange={(v) => {
              setLogicType(v as LogicType);
              setCurrentPage(1);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">同时满足（AND）</SelectItem>
                <SelectItem value="OR">满足任意（OR）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 加分项标签 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-emerald-600">加分项</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleSelectAll('plus')}
                className="h-6 text-xs"
              >
                全选/取消
              </Button>
            </div>
            {tagsLoading ? (
              <div className="text-sm text-muted-foreground">加载中...</div>
            ) : (
              <div className="space-y-2">
                {plusTags.map(tag => (
                  <div key={tag.id} className="flex items-start gap-2">
                    <Checkbox
                      id={`tag-${tag.id}`}
                      checked={selectedTagIds.includes(tag.id)}
                      onCheckedChange={() => handleTagToggle(tag.id)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={`tag-${tag.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {tag.name}
                        {tag.tagType === 'system' && (
                          <Badge variant="outline" className="ml-1 text-xs">系统</Badge>
                        )}
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tag.meaning}
                      </p>
                      {statisticsData && (
                        <p className="text-xs text-emerald-600 mt-0.5">
                          匹配: {statisticsData.find(s => s.tagId === tag.id)?.matchedStocks || 0} 只
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 减分项标签 */}
          {minusTags.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-red-600">减分项</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSelectAll('minus')}
                  className="h-6 text-xs"
                >
                  全选/取消
                </Button>
              </div>
              <div className="space-y-2">
                {minusTags.map(tag => (
                  <div key={tag.id} className="flex items-start gap-2">
                    <Checkbox
                      id={`tag-${tag.id}`}
                      checked={selectedTagIds.includes(tag.id)}
                      onCheckedChange={() => handleTagToggle(tag.id)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={`tag-${tag.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {tag.name}
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tag.meaning}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearFilter}
              className="flex-1"
            >
              清空筛选
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => refetch()}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              刷新
            </Button>
          </div>
        </div>
      </Card>

      {/* 右侧结果展示 */}
      <div className="flex-1 flex flex-col gap-4">
        {/* 工具栏 */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                共找到 <span className="font-semibold text-foreground">{stocksData?.total || 0}</span> 只股票
              </div>
              {stocksData?.tradeDate && (
                <div className="text-sm text-muted-foreground">
                  交易日期: {stocksData.tradeDate}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-sm">排序:</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tagScore">标签得分</SelectItem>
                  <SelectItem value="tagCount">标签数量</SelectItem>
                  <SelectItem value="pctChange">涨跌幅</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">降序</SelectItem>
                  <SelectItem value="asc">升序</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* 股票列表 */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            {stocksLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">加载中...</div>
              </div>
            ) : stocksData?.stocks.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">没有找到符合条件的股票</p>
                  <Button variant="outline" size="sm" onClick={handleClearFilter}>
                    清空筛选条件
                  </Button>
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium">股票代码</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">股票名称</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">当前价</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">涨跌幅</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">标签得分</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">匹配标签</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">标签详情</th>
                  </tr>
                </thead>
                <tbody>
                  {stocksData?.stocks.map((stock) => {
                    const matchedTagNames = (stock.matchedTagNames as string[] || []).filter(Boolean);
                    return (
                      <tr key={`${stock.tsCode}-${stock.tradeDate}`} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm font-mono">{stock.tsCode}</td>
                        <td className="px-4 py-3 text-sm font-medium">{stock.stockName}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          ¥{stock.currentPrice?.toFixed(2) || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {formatPctChange(stock.pctChange ? parseFloat(stock.pctChange.toString()) : null)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              'font-semibold',
                              stock.tagScore && stock.tagScore > 3 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            )}
                          >
                            {stock.tagScore || 0}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm">
                            {stock.matchedTags || 0} / {stock.totalTags || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {matchedTagNames.slice(0, 5).map((tagName, idx) => (
                              <Badge 
                                key={idx} 
                                variant="outline" 
                                className={cn('text-xs', getTagBadgeStyle(tagName))}
                              >
                                {tagName}
                              </Badge>
                            ))}
                            {matchedTagNames.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{matchedTagNames.length - 5}
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* 分页 */}
          {stocksData && stocksData.totalPages > 1 && (
            <div className="border-t p-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                第 {currentPage} 页，共 {stocksData.totalPages} 页
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(stocksData.totalPages, p + 1))}
                  disabled={currentPage === stocksData.totalPages}
                >
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
