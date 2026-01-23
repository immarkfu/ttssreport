/**
 * 侧边栏导航组件
 * 设计风格：功能主义 - 清晰的导航层级，支持伸缩
 * 支持用户信息显示和登出
 */

import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Database,
  Heart,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Tags,
  Users,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface UserInfo {
  id: number;
  openId?: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  username?: string;
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  user?: UserInfo | null;
  onLogout?: () => void;
}

const baseNavItems = [
  { id: 'dashboard', label: '总览仪表盘', icon: LayoutDashboard },
  { id: 'b1-signals', label: '每日B1观察提醒', icon: TrendingUp },
  // { id: 's1-signals', label: '每日S1卖出提醒', icon: TrendingDown },
  { id: 'observation', label: '观察分析看板', icon: BarChart3 },
  // { id: 'config-tags', label: '配置标签管理', icon: Tags },
];

const adminNavItems = [
  { id: 'user-management', label: '账号管理', icon: Users },
];

export default function Sidebar({ activeTab, onTabChange, collapsed, onToggleCollapse, user, onLogout }: SidebarProps) {
  const navItems = user?.role === 'admin' ? [...baseNavItems, ...adminNavItems] : baseNavItems;
  return (
    <aside 
      className={cn(
        "bg-sidebar border-r border-sidebar-border flex flex-col h-screen sticky top-0 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo区域 */}
      <div className={cn("border-b border-sidebar-border", collapsed ? "p-3" : "p-5")}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-semibold text-sidebar-foreground whitespace-nowrap">知行量化</h1>
              <p className="text-xs text-muted-foreground whitespace-nowrap">D-Quant Pro</p>
            </div>
          )}
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className={cn("flex-1 space-y-1", collapsed ? "p-2" : "p-3")}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          const buttonContent = (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'w-full text-left transition-all duration-200 rounded-lg flex items-center',
                collapsed ? 'p-2.5 justify-center' : 'px-3 py-2.5 gap-3',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-muted'
              )}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-emerald-600' : 'text-muted-foreground')} />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.id} delayDuration={0}>
                <TooltipTrigger asChild>
                  {buttonContent}
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return buttonContent;
        })}
      </nav>

      {/* 底部状态区域 */}
      <div className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-4")}>
        {!collapsed ? (
          <div className="space-y-3">
            {/* 用户信息 */}
            {user && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.username || user.name || '用户'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.role || user.email || ''}</p>
                  </div>
                </div>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={onLogout}
                    >
                      <LogOut className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    退出登录
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

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
        ) : (
          <div className="flex flex-col items-center gap-2">
            {/* 用户头像 */}
            {user && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={onLogout}
                    className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                  >
                    <User className="w-4 h-4 text-primary" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  <div className="text-sm">
                    <p className="font-medium">{user.username || user.name || '用户'}</p>
                    <p className="text-xs text-muted-foreground">点击退出登录</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                数据源: 在线
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Heart className="w-4 h-4 text-rose-400" />
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                踏踏实实 · 知行合一 · Love & Share
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* 伸缩按钮 */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
    </aside>
  );
}
