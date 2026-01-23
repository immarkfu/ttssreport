/**
 * 顶部导航栏组件
 * 设计风格：功能主义 - 信息清晰展示
 */

import { Calendar, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  currentDate?: string;
}

export default function Header({ currentDate }: HeaderProps) {
  // 获取最近一个交易日（排除周末）
  const getLatestTradingDay = () => {
    const date = new Date();
    let day = date.getDay();
    
    // 如果是周末，回退到上一个工作日
    if (day === 0) { // 周日
      date.setDate(date.getDate() - 2);
    } else if (day === 6) { // 周六
      date.setDate(date.getDate() - 1);
    }
    
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\//g, '/');
  };

  const latestTradingDay = currentDate || getLatestTradingDay();

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6">
      {/* 左侧：日期信息 */}
      <div className="flex items-center gap-2 text-sm">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="font-mono">{latestTradingDay} (最近交易日)</span>
      </div>

      {/* 右侧：合规提醒 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-xs text-amber-700">
            数据仅供参考，不构成投资建议
          </span>
        </div>
      </div>
    </header>
  );
}
