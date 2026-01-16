/**
 * 顶部导航栏组件
 * 设计风格：功能主义 - 信息清晰展示
 */

import { Calendar, Database, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  currentDate?: string;
}

export default function Header({ currentDate }: HeaderProps) {
  const today = currentDate || new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '/');

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6">
      {/* 左侧：数据源信息 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Database className="w-4 h-4 text-emerald-500" />
          <span className="text-muted-foreground">数据源:</span>
          <span className="font-medium">Tushare / 扣子工作流</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="font-mono">{today}</span>
        </div>
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
