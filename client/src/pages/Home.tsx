/**
 * 知行量化数据平台 - 主页面
 * 设计风格：功能主义 (Bauhaus Functionalism)
 * 核心理念：踏踏实实、知行合一、Love & Share
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import DashboardOverview from '@/components/DashboardOverview';
import SignalDetailView from '@/components/SignalDetailView';
import ObservationDashboard from '@/components/ObservationDashboard';
import ConfigView from '@/components/ConfigView';
import { b1SignalList, s1SignalList } from '@/data/mockData';
import { getLoginUrl } from '@/const';
import { Button } from '@/components/ui/button';
import { LogIn, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // 回测池状态 - 存储选中的股票代码
  const [backtestPool, setBacktestPool] = useState<Set<string>>(new Set());

  // 从服务器加载回测池数据
  const { data: savedBacktestPool } = trpc.config.getBacktestPool.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // 保存回测池到服务器
  const saveBacktestPoolMutation = trpc.config.saveBacktestPool.useMutation();

  // 初始化回测池数据
  useEffect(() => {
    if (savedBacktestPool) {
      setBacktestPool(new Set(savedBacktestPool));
    }
  }, [savedBacktestPool]);

  // 处理回测池变更
  const handleBacktestPoolChange = (code: string, checked: boolean) => {
    setBacktestPool(prev => {
      const newPool = new Set(prev);
      if (checked) {
        newPool.add(code);
      } else {
        newPool.delete(code);
      }
      // 保存到服务器
      saveBacktestPoolMutation.mutate({ codes: Array.from(newPool) });
      return newPool;
    });
  };

  // 处理导航（包括仪表盘卡片下钻）
  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  // 登录加载中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">正在加载...</p>
        </div>
      </div>
    );
  }

  // 未登录状态 - 显示登录页面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4">
          <div className="bg-card rounded-lg border border-border/50 p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold text-primary">知行</span>
            </div>
            <h1 className="text-2xl font-semibold mb-2">知行量化数据平台</h1>
            <p className="text-muted-foreground mb-6">
              踏踏实实 · 知行合一 · Love & Share
            </p>
            <Button
              className="w-full"
              onClick={() => window.location.href = getLoginUrl()}
            >
              <LogIn className="w-4 h-4 mr-2" />
              登录以继续
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              数据仅供参考，不构成投资建议
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview onNavigate={handleNavigate} />;
      case 'b1-signals':
        return (
          <SignalDetailView 
            signals={b1SignalList} 
            type="B1" 
            backtestPool={backtestPool}
            onBacktestPoolChange={handleBacktestPoolChange}
          />
        );
      case 's1-signals':
        return (
          <SignalDetailView 
            signals={s1SignalList} 
            type="S1" 
            backtestPool={backtestPool}
            onBacktestPoolChange={handleBacktestPoolChange}
          />
        );
      case 'observation':
        return <ObservationDashboard />;
      case 'config':
        return <ConfigView />;
      default:
        return <DashboardOverview onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* 左侧导航栏 */}
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={user}
        onLogout={logout}
      />

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航 */}
        <Header currentDate="2026/01/16" />

        {/* 内容区域 */}
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>

        {/* 底部合规声明 */}
        <footer className="border-t border-border bg-card px-6 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>© 2026 知行量化数据平台</span>
              <span className="text-border">|</span>
              <span>数据来源: Tushare / 扣子工作流</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-amber-600">
                风险提示: 本平台数据仅供参考，不构成投资建议
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
