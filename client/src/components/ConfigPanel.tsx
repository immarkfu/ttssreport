import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Save, Settings, X, Filter, Loader2 } from 'lucide-react';
import { TagItem } from '@/services/b1SignalService';

export interface B1Config {
  b1JThreshold: number;
  b1MacdDifThreshold: number;
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
  tags?: TagItem[];
  selectedTagCodes?: string[];
  onTagCodesChange?: (codes: string[]) => void;
  tradeDate?: string;
  onTradeDateChange?: (date: string) => void;
  onFilter?: () => void;
  onSaveConfig?: () => void;
  filterLoading?: boolean;
  onTagUpdate?: (id: number, thresholdValue: number | null, isUpdate: boolean) => void;
}

export default function ConfigPanel({ 
  type, 
  config, 
  onChange, 
  onSave,
  tags = [],
  selectedTagCodes = [],
  onTagCodesChange,
  tradeDate = '',
  onTradeDateChange,
  onFilter,
  onSaveConfig,
  filterLoading = false,
  onTagUpdate = () => {},
}: ConfigPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
    setHasChanges(true);
  };

  const handleTagCheckChange = (tag: TagItem) => {
    onTagUpdate?.(tag.id, null, false);
  };

  const handleThresholdChange = (tagId: number, value: number) => {
    onTagUpdate?.(tagId, value, true);
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
      {!isExpanded && (
        <Button
          onClick={() => setIsExpanded(true)}
          className="rounded-full w-12 h-12 shadow-lg"
          size="icon"
        >
          <Settings className="w-5 h-5" />
        </Button>
      )}

      {isExpanded && (
        <div className="bg-card rounded-lg border border-border shadow-2xl w-80 max-h-[600px] overflow-y-auto">
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

          <div className="p-4 space-y-4">
            {type === 'B1' ? (
              <>
                <div className="space-y-2">
                  <Label>交易日期</Label>
                  <Input
                    type="text"
                    placeholder="YYYYMMDD"
                    value={tradeDate}
                    onChange={(e) => onTradeDateChange?.(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>标签启用</Label>
                  <div className="max-h-48 overflow-y-auto space-y-2 p-2 border rounded-lg">
                    {tags.length === 0 ? (
                      <p className="text-xs text-muted-foreground">加载中...</p>
                    ) : (
                      tags.map((tag) => (
                        <div key={tag.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tag-${tag.id}`}
                            checked={tag.is_enabled === 1}
                            onCheckedChange={() => handleTagCheckChange(tag)}
                          />
                          <label
                            htmlFor={`tag-${tag.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {tag.tag_name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onFilter}
                    disabled={filterLoading || !tradeDate}
                  >
                    {filterLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Filter className="w-4 h-4 mr-1" />}
                    标签筛选
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={onSaveConfig}
                    disabled={filterLoading || !tradeDate}
                  >
                    {filterLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                    保存配置
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="panel-b1JThreshold">J值阈值</Label>
                      <span className="text-sm font-mono text-muted-foreground">
                        {(config as B1Config).b1JThreshold}
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
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="panel-b1MacdDifThreshold">MACD_DIF阈值</Label>
                      <span className="text-sm font-mono text-muted-foreground">
                        {(config as B1Config).b1MacdDifThreshold}
                      </span>
                    </div>
                    <Slider
                      id="panel-b1MacdDifThreshold"
                      value={[(config as B1Config).b1MacdDifThreshold * 10]}
                      onValueChange={([v]) => handleChange('b1MacdDifThreshold', v / 10)}
                      max={20}
                      min={-10}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="panel-b1VolumeRatio">量比阈值</Label>
                      <span className="text-sm font-mono text-muted-foreground">
                        {(config as B1Config).b1VolumeRatio}x
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
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
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
                        {(config as S1Config).s1JThreshold}
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
                </div>
              </>
            )}
          </div>

          <div className="p-4 border-t border-border sticky bottom-0 bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {hasChanges ? '有未保存的更改' : '配置已同步'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
