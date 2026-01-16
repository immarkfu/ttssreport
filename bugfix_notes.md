# Bug修复记录

## 发现的问题

1. S1卖出提醒页面切换后，K线图显示的仍然是之前B1页面选中的股票（宁德时代），而不是S1列表的第一只股票（比亚迪）
2. 需要修复SignalDetailView组件，确保在signals列表变化时重置selectedSignal

## 修复方案

在SignalDetailView组件中添加useEffect，监听signals变化并重置选中状态
