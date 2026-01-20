/**
 * 配置面板组件 - 用于B1和S1页面右下角的配置项
 * 支持实时预览和保存功能
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Save, Settings, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export interface B1Config {
  b1JThreshold: number;
  b1VolumeRatio: number;
  b1RedGreenCondition: boolean;
}

export interface S1Config {
  s1BreakWhiteLine: boolean;
  s1LongYangFly: boolean;
  s1JThreshold: number;
  s1VolumeCondition: boolean;
}

interface ConfigPanelProps {
  type: 'B1' | 'S1';
  config: B1Config | S1Config;
  onChange: (config: B1Config | S1Config) => void;
  onSave: () => void;
}

export default function ConfigPanel({ type, config, onChange, onSave }: ConfigPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave();
    setHasChanges(false);
    toast.success('配置已保存', {
      description: '参数设置已更新',
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* 折叠按钮 */}
      {!isExpanded && (
        <Button
          onClick={() => setIsExpanded(true)}
          className="rounded-full w-12 h-12 shadow-lg"
          size="icon"
        >
          <Settings className="w-5 h-5" />
        </Button>
      )}

      {/* 展开的配置面板 */}
      {isExpanded && (
        <div className="bg-card rounded-lg border border-border shadow-2xl w-80 max-h-[600px] overflow-y-auto">
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-5 rounded-full ${type === 'B1' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <h3 className="font-medium">{type}配置</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(false)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* 配置内容 */}
          <div className="p-4 space-y-4">
            {type === 'B1' ? (
              <>
                {/* B1配置项 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="panel-b1JThreshold">J值阈值</Label>
                    <span className="text-sm font-mono text-muted-foreground">
                      当前: {(config as B1Config).b1JThreshold}
                    </span>
                  </div>
                  <Slider
                    id="panel-b1JThreshold"
                    value={[(config as B1Config).b1JThreshold]}
                    onValueChange={([v]) => handleChange('b1JThreshold', v)}
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
                    <Label htmlFor="panel-b1VolumeRatio">量比阈值</Label>
                    <span className="text-sm font-mono text-muted-foreground">
                      当前: {(config as B1Config).b1VolumeRatio}x
                    </span>
                  </div>
                  <Slider
                    id="panel-b1VolumeRatio"
                    value={[(config as B1Config).b1VolumeRatio * 10]}
                    onValueChange={([v]) => handleChange('b1VolumeRatio', v / 10)}
                    max={30}
                    min={10}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    成交量需达到均量的倍数（默认: 1.0x）
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <Label htmlFor="panel-b1RedGreenCondition">红肥绿瘦条件</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      开启后，需满足红柱大于绿柱的条件
                    </p>
                  </div>
                  <Switch
                    id="panel-b1RedGreenCondition"
                    checked={(config as B1Config).b1RedGreenCondition}
                    onCheckedChange={(v) => handleChange('b1RedGreenCondition', v)}
                  />
                </div>
              </>
            ) : (
              <>
                {/* S1配置项 */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <Label htmlFor="panel-s1BreakWhiteLine">跌破白线触发</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      价格跌破知行白线时触发卖出信号
                    </p>
                  </div>
                  <Switch
                    id="panel-s1BreakWhiteLine"
                    checked={(config as S1Config).s1BreakWhiteLine}
                    onCheckedChange={(v) => handleChange('s1BreakWhiteLine', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <Label htmlFor="panel-s1LongYangFly">长阳放飞触发</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      出现长阳后回落时触发卖出信号
                    </p>
                  </div>
                  <Switch
                    id="panel-s1LongYangFly"
                    checked={(config as S1Config).s1LongYangFly}
                    onCheckedChange={(v) => handleChange('s1LongYangFly', v)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="panel-s1JThreshold">J值超买阈值</Label>
                    <span className="text-sm font-mono text-muted-foreground">
                      当前: {(config as S1Config).s1JThreshold}
                    </span>
                  </div>
                  <Slider
                    id="panel-s1JThreshold"
                    value={[(config as S1Config).s1JThreshold]}
                    onValueChange={([v]) => handleChange('s1JThreshold', v)}
                    max={100}
                    min={70}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    J值高于此阈值时触发超买警告（默认: 85）
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <Label htmlFor="panel-s1VolumeCondition">放量条件</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      开启后，需满足放量条件才触发卖出信号
                    </p>
                  </div>
                  <Switch
                    id="panel-s1VolumeCondition"
                    checked={(config as S1Config).s1VolumeCondition}
                    onCheckedChange={(v) => handleChange('s1VolumeCondition', v)}
                  />
                </div>
              </>
            )}
          </div>

          {/* 底部操作按钮 */}
          <div className="p-4 border-t border-border sticky bottom-0 bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {hasChanges ? '有未保存的更改' : '配置已同步'}
              </span>
            </div>
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              保存配置
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
