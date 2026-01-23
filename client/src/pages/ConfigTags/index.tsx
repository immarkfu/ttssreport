/**
 * 配置标签管理页面
 * 支持少妇战法（B1/S1）的配置标签管理
 */

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Power, PowerOff, GripVertical, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { configTagsService, ConfigTag } from '@/services/configTagsService';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TagFormData {
  name: string;
  meaning: string;
  calculationLogic: string;
  category: 'plus' | 'minus';
  strategyType: string;
}

// 可拖拽的标签行组件
function SortableTagRow({ tag, onEdit, onDelete, onToggle }: {
  tag: ConfigTag;
  onEdit: (tag: ConfigTag) => void;
  onDelete: (tag: ConfigTag) => void;
  onToggle: (tag: ConfigTag) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: tag.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow"
    >
      {/* 拖拽手柄 */}
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* 标签信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium truncate">{tag.name}</h4>
          <Badge variant={tag.tagType === 'system' ? 'secondary' : 'outline'} className="text-xs">
            {tag.tagType === 'system' ? '系统' : '自定义'}
          </Badge>
          <Badge variant={tag.category === 'plus' ? 'default' : 'destructive'} className="text-xs">
            {tag.category === 'plus' ? '加分项' : '减分项'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">{tag.meaning}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate font-mono">{tag.calculationLogic}</p>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        <Switch
          checked={tag.isEnabled}
          onCheckedChange={() => onToggle(tag)}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(tag)}
        >
          <Edit className="w-4 h-4" />
        </Button>
        {tag.tagType === 'custom' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(tag)}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ConfigTagsManagement() {
  const [activeStrategy, setActiveStrategy] = useState<string>('B1');
  const [activeCategory, setActiveCategory] = useState<'plus' | 'minus'>('plus');
  const [tags, setTags] = useState<ConfigTag[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ConfigTag | null>(null);
  const [deletingTag, setDeletingTag] = useState<ConfigTag | null>(null);
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    meaning: '',
    calculationLogic: '',
    category: 'plus',
    strategyType: 'B1',
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<ConfigTag[]>([]);

  const fetchTags = async () => {
    try {
      const data = await configTagsService.list({ strategyType: activeStrategy });
      setAllTags(data);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [activeStrategy]);

  const refetch = fetchTags;

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 过滤标签
  useEffect(() => {
    if (allTags) {
      const filtered = allTags.filter(tag => tag.category === activeCategory);
      setTags(filtered);
    }
  }, [allTags, activeCategory]);

  // 打开新增对话框
  const handleAdd = () => {
    setEditingTag(null);
    setFormData({
      name: '',
      meaning: '',
      calculationLogic: '',
      category: activeCategory,
      strategyType: activeStrategy,
    });
    setValidationErrors([]);
    setIsDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (tag: ConfigTag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      meaning: tag.meaning,
      calculationLogic: tag.calculationLogic,
      category: tag.category,
      strategyType: tag.strategyType,
    });
    setValidationErrors([]);
    setIsDialogOpen(true);
  };

  const handleValidateLogic = async () => {
    try {
      const result = await configTagsService.validateLogic(formData.calculationLogic);
      if (result.valid) {
        toast.success('验证通过', { description: '计算逻辑格式正确' });
        setValidationErrors([]);
      } else {
        toast.error('验证失败', { description: result.errors.join('; ') });
        setValidationErrors(result.errors);
      }
    } catch (error: any) {
      toast.error('验证失败', { description: error.message });
    }
  };

  const handleSave = async () => {
    try {
      if (editingTag) {
        await configTagsService.update({ id: editingTag.id, ...formData });
        toast.success('更新成功', { description: '标签已更新' });
      } else {
        await configTagsService.create(formData);
        toast.success('创建成功', { description: '新标签已创建' });
      }
      setIsDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast.error('操作失败', { description: error.message });
    }
  };

  const handleDelete = async () => {
    if (!deletingTag) return;
    try {
      await configTagsService.delete(deletingTag.id);
      toast.success('删除成功', { description: '标签已删除' });
      setIsDeleteDialogOpen(false);
      setDeletingTag(null);
      refetch();
    } catch (error: any) {
      toast.error('删除失败', { description: error.message });
    }
  };

  const handleToggle = async (tag: ConfigTag) => {
    try {
      await configTagsService.toggleEnabled(tag.id, !tag.isEnabled);
      toast.success(tag.isEnabled ? '已禁用' : '已启用');
      refetch();
    } catch (error: any) {
      toast.error('操作失败', { description: error.message });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tags.findIndex(tag => tag.id === active.id);
    const newIndex = tags.findIndex(tag => tag.id === over.id);

    const newTags = arrayMove(tags, oldIndex, newIndex);
    setTags(newTags);

    try {
      await configTagsService.reorder(newTags.map(tag => tag.id));
      toast.success('排序已保存');
      refetch();
    } catch (error: any) {
      toast.error('排序失败', { description: error.message });
      setTags(tags);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>配置标签管理</CardTitle>
          <CardDescription>
            管理少妇战法（B1/S1）的配置标签，支持拖拽排序
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 战法类型选择 */}
          <Tabs value={activeStrategy} onValueChange={setActiveStrategy} className="mb-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="B1">B1战法</TabsTrigger>
              <TabsTrigger value="S1">S1战法</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 分类选择和新增按钮 */}
          <div className="flex items-center justify-between mb-4">
            <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as 'plus' | 'minus')}>
              <TabsList>
                <TabsTrigger value="plus">加分项</TabsTrigger>
                <TabsTrigger value="minus">减分项</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              新增标签
            </Button>
          </div>

          {/* 标签列表 */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tags.map(tag => tag.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {tags.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无标签，点击"新增标签"创建第一个标签
                  </div>
                ) : (
                  tags.map(tag => (
                    <SortableTagRow
                      key={tag.id}
                      tag={tag}
                      onEdit={handleEdit}
                      onDelete={(tag) => {
                        setDeletingTag(tag);
                        setIsDeleteDialogOpen(true);
                      }}
                      onToggle={handleToggle}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      {/* 新增/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTag ? '编辑标签' : '新增标签'}</DialogTitle>
            <DialogDescription>
              {editingTag?.tagType === 'system' && '系统标签仅允许修改含义和计算逻辑'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 标签名称 */}
            <div className="space-y-2">
              <Label htmlFor="name">标签名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={editingTag?.tagType === 'system'}
                placeholder="例如：红肥绿瘦"
              />
            </div>

            {/* 战法类型 */}
            <div className="space-y-2">
              <Label htmlFor="strategyType">战法类型 *</Label>
              <Select
                value={formData.strategyType}
                onValueChange={(v) => setFormData({ ...formData, strategyType: v })}
                disabled={editingTag?.tagType === 'system'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B1">B1战法</SelectItem>
                  <SelectItem value="S1">S1战法</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 分类 */}
            <div className="space-y-2">
              <Label htmlFor="category">分类 *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v as 'plus' | 'minus' })}
                disabled={editingTag?.tagType === 'system'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plus">加分项</SelectItem>
                  <SelectItem value="minus">减分项</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 含义 */}
            <div className="space-y-2">
              <Label htmlFor="meaning">含义/业务规则 *</Label>
              <Textarea
                id="meaning"
                value={formData.meaning}
                onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                placeholder="例如：近期交易量健康（红肥绿瘦）"
                rows={3}
              />
            </div>

            {/* 计算逻辑 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="calculationLogic">计算取数逻辑 *</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleValidateLogic}
                  disabled={!formData.calculationLogic}
                >
                  验证逻辑
                </Button>
              </div>
              <Textarea
                id="calculationLogic"
                value={formData.calculationLogic}
                onChange={(e) => setFormData({ ...formData, calculationLogic: e.target.value })}
                placeholder="例如：最近10个交易日所有上涨的交易日的交易量＞最近的前一个或后一个下跌交易日的交易量"
                rows={5}
                className="font-mono text-sm"
              />
              {validationErrors.length > 0 && (
                <div className="text-sm text-destructive space-y-1">
                  {validationErrors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || !formData.meaning || !formData.calculationLogic}
            >
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除标签"{deletingTag?.name}"吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
