/**
 * 知行量化数据平台 - 主页面
 * 设计风格：功能主义 (Bauhaus Functionalism)
 * 核心理念：踏踏实实、知行合一、Love & Share
 */

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import DashboardOverview from '@/components/DashboardOverview';
import SignalDetailView from '@/components/SignalDetailView';
import BacktestView from '@/components/BacktestView';
import ConfigView from '@/components/ConfigView';
import { b1SignalList, s1SignalList } from '@/data/mockData';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'b1-signals':
        return <SignalDetailView signals={b1SignalList} type="B1" />;
      case 's1-signals':
        return <SignalDetailView signals={s1SignalList} type="S1" />;
      case 'backtest':
        return <BacktestView />;
      case 'config':
        return <ConfigView />;
      default:
        return <DashboardOverview />;
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
