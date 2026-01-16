/**
 * D战法配置视图组件
 * 设计风格：功能主义 - 参数配置界面
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Save, RotateCcw, Info } from 'lucide-react';

export default function ConfigView() {
  const [config, setConfig] = useState({
    // B1信号参数
    b1JThreshold: 13,
    b1MacdPositive: true,
    b1VolumeRatio: 1.5,
    
    // S1信号参数
    s1BreakWhiteLine: true,
    s1LongYangFly: true,
    s1JThreshold: 85,
    
    // 通用参数
    monitorDays: 60,
    autoRefresh: true,
    refreshInterval: 5,
  });

  const handleSave = () => {
    toast.success('配置已保存', {
      description: '参数设置已更新，将在下次数据刷新时生效',
    });
  };

  const handleReset = () => {
    setConfig({
      b1JThreshold: 13,
      b1MacdPositive: true,
      b1VolumeRatio: 1.5,
      s1BreakWhiteLine: true,
      s1LongYangFly: true,
      s1JThreshold: 85,
      monitorDays: 60,
      autoRefresh: true,
      refreshInterval: 5,
    });
    toast.info('已恢复默认配置');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 页面标题 */}
      <div>
        <h2 className="text-xl font-semibold">D战法配置</h2>
        <p className="text-sm text-muted-foreground mt-1">
          调整量化策略的核心参数
        </p>
      </div>

      {/* B1信号参数 */}
      <div className="bg-card rounded-lg border border-border/50 p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
          <h3 className="font-medium">B1观察信号参数</h3>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="b1JThreshold">J值阈值</Label>
              <span className="text-sm font-mono text-muted-foreground">
                当前: {config.b1JThreshold}
              </span>
            </div>
            <Slider
              id="b1JThreshold"
              value={[config.b1JThreshold]}
              onValueChange={([v]) => setConfig({ ...config, b1JThreshold: v })}
              max={30}
              min={0}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              J值低于此阈值时触发观察信号（默认: 13）
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="b1VolumeRatio">量比阈值</Label>
              <span className="text-sm font-mono text-muted-foreground">
                当前: {config.b1VolumeRatio}x
              </span>
            </div>
            <Slider
              id="b1VolumeRatio"
              value={[config.b1VolumeRatio * 10]}
              onValueChange={([v]) => setConfig({ ...config, b1VolumeRatio: v / 10 })}
              max={30}
              min={10}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              成交量需达到均量的倍数（默认: 1.5x）
            </p>
          </div>

          <div className="flex items-center justify-between col-span-2 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="b1MacdPositive">MACD需为正值</Label>
              <p className="text-xs text-muted-foreground mt-1">
                开启后，仅在MACD柱为正时触发信号
              </p>
            </div>
            <Switch
              id="b1MacdPositive"
              checked={config.b1MacdPositive}
              onCheckedChange={(v) => setConfig({ ...config, b1MacdPositive: v })}
            />
          </div>
        </div>
      </div>

      {/* S1信号参数 */}
      <div className="bg-card rounded-lg border border-border/50 p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1.5 h-5 bg-red-500 rounded-full" />
          <h3 className="font-medium">S1卖出信号参数</h3>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="s1BreakWhiteLine">跌破白线触发</Label>
              <p className="text-xs text-muted-foreground mt-1">
                价格跌破知行白线时触发卖出信号
              </p>
            </div>
            <Switch
              id="s1BreakWhiteLine"
              checked={config.s1BreakWhiteLine}
              onCheckedChange={(v) => setConfig({ ...config, s1BreakWhiteLine: v })}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="s1LongYangFly">长阳放飞触发</Label>
              <p className="text-xs text-muted-foreground mt-1">
                出现长阳后回落时触发卖出信号
              </p>
            </div>
            <Switch
              id="s1LongYangFly"
              checked={config.s1LongYangFly}
              onCheckedChange={(v) => setConfig({ ...config, s1LongYangFly: v })}
            />
          </div>

          <div className="space-y-3 col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="s1JThreshold">J值超买阈值</Label>
              <span className="text-sm font-mono text-muted-foreground">
                当前: {config.s1JThreshold}
              </span>
            </div>
            <Slider
              id="s1JThreshold"
              value={[config.s1JThreshold]}
              onValueChange={([v]) => setConfig({ ...config, s1JThreshold: v })}
              max={100}
              min={70}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              J值高于此阈值时触发超买警告（默认: 85）
            </p>
          </div>
        </div>
      </div>

      {/* 通用参数 */}
      <div className="bg-card rounded-lg border border-border/50 p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1.5 h-5 bg-slate-500 rounded-full" />
          <h3 className="font-medium">通用参数</h3>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="monitorDays">监控周期（天）</Label>
            <Input
              id="monitorDays"
              type="number"
              value={config.monitorDays}
              onChange={(e) => setConfig({ ...config, monitorDays: parseInt(e.target.value) || 60 })}
              min={30}
              max={120}
            />
            <p className="text-xs text-muted-foreground">
              K线数据回溯天数（30-120天）
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="refreshInterval">刷新间隔（分钟）</Label>
            <Input
              id="refreshInterval"
              type="number"
              value={config.refreshInterval}
              onChange={(e) => setConfig({ ...config, refreshInterval: parseInt(e.target.value) || 5 })}
              min={1}
              max={60}
              disabled={!config.autoRefresh}
            />
            <p className="text-xs text-muted-foreground">
              数据自动刷新的时间间隔
            </p>
          </div>

          <div className="flex items-center justify-between col-span-2 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="autoRefresh">自动刷新数据</Label>
              <p className="text-xs text-muted-foreground mt-1">
                开启后将按设定间隔自动更新数据
              </p>
            </div>
            <Switch
              id="autoRefresh"
              checked={config.autoRefresh}
              onCheckedChange={(v) => setConfig({ ...config, autoRefresh: v })}
            />
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="w-4 h-4" />
          <span>修改配置后需保存才能生效</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            恢复默认
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            保存配置
          </Button>
        </div>
      </div>

      {/* 说明 */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
        <p>
          <strong>参数说明：</strong>
          以上参数用于调整量化策略的触发条件。参数调整可能影响信号的数量和质量，
          建议在充分理解各参数含义后进行调整。如有疑问，请参考使用文档或保持默认设置。
        </p>
      </div>
    </div>
  );
}
