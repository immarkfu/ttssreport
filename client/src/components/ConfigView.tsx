/**
 * D战法配置视图组件
 * 设计风格：功能主义 - 参数配置界面
 * 支持用户个性化配置存储
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Save, RotateCcw, Info, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface ConfigState {
  // B1信号参数
  b1JThreshold: number;
  b1MacdCondition: string;
  b1VolumeRatio: number;
  b1RedGreenCondition: boolean;
  
  // S1信号参数
  s1BreakWhiteLine: boolean;
  s1LongYangFly: boolean;
  s1JThreshold: number;
  s1VolumeCondition: boolean;
  
  // 监控池配置
  watchlistStocks: string;
  excludedIndustries: string;
}

const defaultConfig: ConfigState = {
  b1JThreshold: 13,
  b1MacdCondition: 'MACD>0',
  b1VolumeRatio: 1.0,
  b1RedGreenCondition: true,
  s1BreakWhiteLine: true,
  s1LongYangFly: true,
  s1JThreshold: 85,
  s1VolumeCondition: true,
  watchlistStocks: '',
  excludedIndustries: '',
};

export default function ConfigView() {
  const [config, setConfig] = useState<ConfigState>(defaultConfig);
  const [hasChanges, setHasChanges] = useState(false);

  // 获取用户配置
  const { data: serverConfig, isLoading, refetch } = trpc.config.get.useQuery();
  
  // 更新配置mutation
  const updateConfig = trpc.config.update.useMutation({
    onSuccess: () => {
      toast.success('配置已保存', {
        description: '参数设置已更新，将在下次数据刷新时生效',
      });
      setHasChanges(false);
      refetch();
    },
    onError: (error) => {
      toast.error('保存失败', {
        description: error.message,
      });
    },
  });

  // 重置配置mutation
  const resetConfig = trpc.config.reset.useMutation({
    onSuccess: () => {
      toast.info('已恢复默认配置');
      setHasChanges(false);
      refetch();
    },
    onError: (error) => {
      toast.error('重置失败', {
        description: error.message,
      });
    },
  });

  // 从服务器配置初始化本地状态
  useEffect(() => {
    if (serverConfig) {
      setConfig({
        b1JThreshold: serverConfig.b1JValueThreshold ?? 13,
        b1MacdCondition: serverConfig.b1MacdCondition ?? 'MACD>0',
        b1VolumeRatio: parseFloat(serverConfig.b1VolumeRatio ?? '1.0'),
        b1RedGreenCondition: serverConfig.b1RedGreenCondition ?? true,
        s1BreakWhiteLine: serverConfig.s1WhiteLineBreak ?? true,
        s1LongYangFly: serverConfig.s1LongYangFly ?? true,
        s1JThreshold: serverConfig.s1JValueHigh ?? 85,
        s1VolumeCondition: serverConfig.s1VolumeCondition ?? true,
        watchlistStocks: serverConfig.watchlistStocks || '',
        excludedIndustries: serverConfig.excludedIndustries || '',
      });
    }
  }, [serverConfig]);

  const handleConfigChange = (key: keyof ConfigState, value: ConfigState[keyof ConfigState]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateConfig.mutate({
      b1JValueThreshold: config.b1JThreshold,
      b1MacdCondition: config.b1MacdCondition,
      b1VolumeRatio: config.b1VolumeRatio.toString(),
      b1RedGreenCondition: config.b1RedGreenCondition,
      s1WhiteLineBreak: config.s1BreakWhiteLine,
      s1LongYangFly: config.s1LongYangFly,
      s1JValueHigh: config.s1JThreshold,
      s1VolumeCondition: config.s1VolumeCondition,
      watchlistStocks: config.watchlistStocks || null,
      excludedIndustries: config.excludedIndustries || null,
    });
  };

  const handleReset = () => {
    resetConfig.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 页面标题 */}
      <div>
        <h2 className="text-xl font-semibold">D战法配置</h2>
        <p className="text-sm text-muted-foreground mt-1">
          调整量化策略的核心参数（配置将自动保存到您的账户）
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
              onValueChange={([v]) => handleConfigChange('b1JThreshold', v)}
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
              onValueChange={([v]) => handleConfigChange('b1VolumeRatio', v / 10)}
              max={30}
              min={10}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              成交量需达到均量的倍数（默认: 1.0x）
            </p>
          </div>

          <div className="flex items-center justify-between col-span-2 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="b1RedGreenCondition">红肥绿瘦条件</Label>
              <p className="text-xs text-muted-foreground mt-1">
                开启后，需满足红柱大于绿柱的条件
              </p>
            </div>
            <Switch
              id="b1RedGreenCondition"
              checked={config.b1RedGreenCondition}
              onCheckedChange={(v) => handleConfigChange('b1RedGreenCondition', v)}
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
              onCheckedChange={(v) => handleConfigChange('s1BreakWhiteLine', v)}
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
              onCheckedChange={(v) => handleConfigChange('s1LongYangFly', v)}
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
              onValueChange={([v]) => handleConfigChange('s1JThreshold', v)}
              max={100}
              min={70}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              J值高于此阈值时触发超买警告（默认: 85）
            </p>
          </div>

          <div className="flex items-center justify-between col-span-2 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="s1VolumeCondition">放量条件</Label>
              <p className="text-xs text-muted-foreground mt-1">
                开启后，需满足放量条件才触发卖出信号
              </p>
            </div>
            <Switch
              id="s1VolumeCondition"
              checked={config.s1VolumeCondition}
              onCheckedChange={(v) => handleConfigChange('s1VolumeCondition', v)}
            />
          </div>
        </div>
      </div>

      {/* 监控池配置 */}
      <div className="bg-card rounded-lg border border-border/50 p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
          <h3 className="font-medium">监控池配置</h3>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-3">
            <Label htmlFor="watchlistStocks">自选股列表</Label>
            <Input
              id="watchlistStocks"
              placeholder="输入股票代码，用逗号分隔，如：000001,600000,300750"
              value={config.watchlistStocks}
              onChange={(e) => handleConfigChange('watchlistStocks', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              设置后，B1/S1信号将仅显示自选股列表中的股票
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="excludedIndustries">排除行业</Label>
            <Input
              id="excludedIndustries"
              placeholder="输入行业名称，用逗号分隔，如：房地产,银行"
              value={config.excludedIndustries}
              onChange={(e) => handleConfigChange('excludedIndustries', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              设置后，将排除指定行业的股票
            </p>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="w-4 h-4" />
          <span>
            {hasChanges ? '有未保存的更改' : '配置已同步'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={resetConfig.isPending}
          >
            {resetConfig.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-2" />
            )}
            恢复默认
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateConfig.isPending || !hasChanges}
          >
            {updateConfig.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            保存配置
          </Button>
        </div>
      </div>

      {/* 说明 */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
        <p>
          <strong>参数说明：</strong>
          以上参数用于调整量化策略的触发条件。参数调整可能影响信号的数量和质量，
          建议在充分理解各参数含义后进行调整。配置将保存到您的账户，不同设备登录后可同步使用。
        </p>
      </div>
    </div>
  );
}
