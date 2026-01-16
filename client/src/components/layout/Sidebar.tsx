/**
 * 侧边栏导航组件
 * 设计风格：功能主义 - 清晰的导航层级
 */

import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Settings,
  Database,
  Heart,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: '总览仪表盘', icon: LayoutDashboard },
  { id: 'b1-signals', label: '每日B1观察提醒', icon: TrendingUp },
  { id: 's1-signals', label: '每日S1卖出提醒', icon: TrendingDown },
  { id: 'backtest', label: 'B1观察点回测分析', icon: BarChart3 },
  { id: 'config', label: 'D战法配置', icon: Settings },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen sticky top-0">
      {/* Logo区域 */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">知行量化</h1>
            <p className="text-xs text-muted-foreground">D-Quant Pro</p>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'nav-item w-full text-left transition-smooth',
                isActive
                  ? 'active bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-muted'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive ? 'text-emerald-600' : 'text-muted-foreground')} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 底部状态区域 */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
        {/* 数据源状态 */}
        <div className="flex items-center gap-2 text-sm">
          <Database className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">数据源:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-600 font-medium">在线</span>
          </span>
        </div>
        
        {/* 延迟显示 */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>数据延迟:</span>
          <span className="font-mono">250ms</span>
        </div>

        {/* 理念标语 */}
        <div className="pt-3 border-t border-sidebar-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span>踏踏实实 · 知行合一 · Love & Share</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
