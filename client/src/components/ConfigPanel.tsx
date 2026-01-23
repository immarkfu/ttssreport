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
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
    setHasChanges(true);
  };

  const handleTagCheckChange = (tag: TagItem) => {
    onTagUpdate?.(tag.id, null, false);
  };

  const getDisplayName = (tagName: string) => {
    if (tagName === 'J值<13') {
      return 'J大负值';
    }
    return tagName;
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
    <div className="w-full">
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
        <div className="bg-card rounded-lg border border-border shadow-2xl w-full min-h-[180px] overflow-hidden">
          <div className="flex items-center justify-between p-2 border-b border-border sticky top-0 bg-card z-10">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-5 rounded-full ${type === 'B1' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <h3 className="font-medium">{type === 'B1' ? '个人B1筛选器' : `${type}配置`}</h3>
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

          <div className="p-2 min-h-[140px]">
            {type === 'B1' ? (
              <div className="grid grid-cols-4 gap-3 h-full">
                <div className="space-y-3 col-span-2 h-full">
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <Label className="text-sm font-medium">配置标签</Label>
                      <span className="text-xs text-muted-foreground">未保存前仅本次生效，点击保存配置后则后续记忆</span>
                    </div>
                    <div className="h-full overflow-y-auto p-2 border rounded-lg">
                      {tags.length === 0 ? (
                        <p className="text-xs text-muted-foreground">加载中...</p>
                      ) : (
                        <div className="grid grid-cols-6 gap-2">
                          {tags.map((tag) => {
                            const isPlus = tag.category === 'plus';
                            const isEnabled = tag.is_enabled === 1;
                            
                            return (
                              <button
                                key={tag.id}
                                onClick={() => handleTagCheckChange(tag)}
                                className={`text-sm font-medium px-2 py-1 rounded transition-colors ${
                                  isEnabled 
                                    ? isPlus 
                                      ? 'bg-[#FFF3E0] text-red-700 border border-red-200' 
                                      : 'bg-[#E8F5E9] text-green-700 border border-green-200'
                                    : isPlus
                                      ? 'bg-gray-100 text-red-600 border border-gray-200'
                                      : 'bg-gray-100 text-green-600 border border-gray-200'
                                }`}
                              >
                                {getDisplayName(tag.tag_name)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 col-span-2 h-full">
                  <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="panel-b1JThreshold" className="text-xs font-medium">J值阈值</Label>
                          <span className="text-xs font-mono text-muted-foreground">
                            {(config as B1Config).b1JThreshold}
                          </span>
                        </div>
                        <Slider
                          id="panel-b1JThreshold"
                          value={[(config as B1Config).b1JThreshold]}
                          onValueChange={([v]) => handleChange('b1JThreshold', v)}
                          max={20}
                          min={0}
                          step={1}
                          className="w-full h-1"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="panel-b1VolumeRatio" className="text-xs font-medium">倍量红柱-量比阈值</Label>
                          <span className="text-xs font-mono text-muted-foreground">
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
                          className="w-full h-1"
                        />
                      </div>

                    <div className="flex gap-2 mt-2">
                      <Button
                        className="flex-1 h-7 text-xs"
                        onClick={onSaveConfig}
                        disabled={filterLoading}
                      >
                        {filterLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                        保存配置
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div>
                      <Label htmlFor="panel-s1BreakWhiteLine" className="text-sm">跌破白线触发</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        价格跌破知行白线时触发卖出信号
                      </p>
                    </div>
                    <Switch
                      id="panel-s1BreakWhiteLine"
                      checked={(config as S1Config).s1BreakWhiteLine}
                      onCheckedChange={(v) => handleChange('s1BreakWhiteLine', v)}
                      className="h-4 w-8"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div>
                      <Label htmlFor="panel-s1LongYangFly" className="text-sm">长阳放飞触发</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        出现长阳后回落时触发卖出信号
                      </p>
                    </div>
                    <Switch
                      id="panel-s1LongYangFly"
                      checked={(config as S1Config).s1LongYangFly}
                      onCheckedChange={(v) => handleChange('s1LongYangFly', v)}
                      className="h-4 w-8"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="panel-s1JThreshold" className="text-sm">J值超买阈值</Label>
                      <span className="text-xs font-mono text-muted-foreground">
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
                      className="w-full h-1"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div>
                      <Label htmlFor="panel-s1VolumeCondition" className="text-sm">放量条件</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        开启后，需满足放量条件才触发卖出信号
                      </p>
                    </div>
                    <Switch
                      id="panel-s1VolumeCondition"
                      checked={(config as S1Config).s1VolumeCondition}
                      onCheckedChange={(v) => handleChange('s1VolumeCondition', v)}
                      className="h-4 w-8"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border sticky bottom-0 bg-card">
            <div className="flex items-center justify-between">
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
