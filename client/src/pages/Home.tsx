/**
 * 知行量化数据平台 - 主页面
 * 设计风格：功能主义 (Bauhaus Functionalism)
 * 核心理念：踏踏实实、知行合一、Love & Share
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import DashboardOverview from '@/components/DashboardOverview';
import SignalDetailView from '@/components/SignalDetailView';
import ObservationDashboard from '@/components/ObservationDashboard';
import { b1SignalList, s1SignalList } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { configService } from '@/services/configService';
import { b1SignalService } from '@/services/b1SignalService';

export default function Home() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [latestTradeDate, setLatestTradeDate] = useState<string>('');
  
  const [backtestPool, setBacktestPool] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) return;
    configService.getBacktestPool().then(codes => {
      setBacktestPool(new Set(codes));
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    const fetchLatestTradeDate = async () => {
      try {
        const response = await b1SignalService.getLatestTradeDate();
        if (response.success && response.latest_trade_date) {
          setLatestTradeDate(response.latest_trade_date);
        }
      } catch (error) {
        console.error('获取交易日失败:', error);
      }
    };
    fetchLatestTradeDate();
  }, []);

  const handleBacktestPoolChange = (code: string, checked: boolean) => {
    setBacktestPool(prev => {
      const newPool = new Set(prev);
      if (checked) {
        newPool.add(code);
      } else {
        newPool.delete(code);
      }
      configService.saveBacktestPool(Array.from(newPool)).catch(() => {});
      return newPool;
    });
  };

  // 处理导航（包括仪表盘卡片下钻）
  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };


  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview onNavigate={handleNavigate} />;
      case 'b1-signals':
        return (
          <SignalDetailView 
            signals={[]} 
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
        return <ObservationDashboard backtestPool={backtestPool} />;
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
        <Header currentDate={latestTradeDate || undefined} />

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
