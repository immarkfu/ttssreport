/**
 * 统计卡片组件
 * 设计风格：功能主义 - 数据清晰展示
 * 支持点击下钻功能
 */

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  clickable?: boolean;
  onClick?: () => void;
}

export default function StatCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  variant = 'default',
  clickable = false,
  onClick,
}: StatCardProps) {
  const variantStyles = {
    default: 'border-border/50',
    success: 'border-l-4 border-l-emerald-500 border-border/50',
    warning: 'border-l-4 border-l-amber-500 border-border/50',
    danger: 'border-l-4 border-l-red-500 border-border/50',
  };

  const handleClick = () => {
    if (clickable && onClick) {
      onClick();
    }
  };

  return (
    <div
      className={cn(
        'stat-card',
        variantStyles[variant],
        clickable && 'cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200'
      )}
      onClick={handleClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (clickable && (e.key === 'Enter' || e.key === ' ')) {
          handleClick();
        }
      }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="stat-card-value">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {change !== undefined && (
            <p className={cn(
              'text-sm font-medium',
              change >= 0 ? 'text-red-500' : 'text-emerald-500'
            )}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)}%
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            'p-2 rounded-lg',
            variant === 'success' && 'bg-emerald-50 text-emerald-600',
            variant === 'warning' && 'bg-amber-50 text-amber-600',
            variant === 'danger' && 'bg-red-50 text-red-600',
            variant === 'default' && 'bg-muted text-muted-foreground'
          )}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {clickable && (
        <div className="mt-2 pt-2 border-t border-border/30 text-xs text-primary flex items-center gap-1">
          <span>点击查看详情</span>
          <span>→</span>
        </div>
      )}
    </div>
  );
}
