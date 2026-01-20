/**
 * 配置标签管理路由
 * 提供配置标签的增删改查、排序、启用/禁用、逻辑验证等功能
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { strategyConfigTags, strategyConfigTagLogs } from "../../drizzle/schema_config_tags";
import { eq, and, desc, asc } from "drizzle-orm";

// ==================== 输入验证Schema ====================

const createTagSchema = z.object({
  name: z.string().min(1, "标签名称不能为空").max(100, "标签名称不能超过100个字符"),
  meaning: z.string().min(1, "含义不能为空"),
  calculationLogic: z.string().min(1, "计算逻辑不能为空"),
  category: z.enum(["plus", "minus"], { required_error: "请选择分类" }),
  strategyType: z.string().min(1, "战法类型不能为空"),
  sortOrder: z.number().int().min(0).default(0),
});

const updateTagSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  meaning: z.string().min(1).optional(),
  calculationLogic: z.string().min(1).optional(),
  category: z.enum(["plus", "minus"]).optional(),
  strategyType: z.string().min(1).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isEnabled: z.boolean().optional(),
});

const deleteTagSchema = z.object({
  id: z.number().int().positive(),
});

const reorderTagsSchema = z.object({
  tagIds: z.array(z.number().int().positive()),
});

const validateLogicSchema = z.object({
  calculationLogic: z.string().min(1),
});

// ==================== 辅助函数 ====================

/**
 * 记录操作日志
 */
async function logOperation(
  tagId: number | null,
  tagName: string,
  operationType: "create" | "update" | "delete" | "enable" | "disable" | "reorder",
  operatedBy: string,
  oldValue?: any,
  newValue?: any,
  remark?: string
) {
  await db.insert(strategyConfigTagLogs).values({
    tagId,
    tagName,
    operationType,
    oldValue: oldValue ? JSON.stringify(oldValue) : null,
    newValue: newValue ? JSON.stringify(newValue) : null,
    operatedBy,
    remark,
  });
}

/**
 * 验证计算逻辑
 * 方案1: 字段名称验证 + 方案2: 语法验证
 */
function validateCalculationLogic(logic: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. 基本语法验证
  // 检查括号匹配
  const openParens = (logic.match(/\(/g) || []).length;
  const closeParens = (logic.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push("括号不匹配");
  }

  // 检查是否有非法字符（允许中文、英文、数字、常见运算符和符号）
  const illegalChars = logic.match(/[^\u4e00-\u9fa5a-zA-Z0-9\s\+\-\*\/\(\)\[\]\{\}<>=!&|%,.:;_#@]/g);
  if (illegalChars && illegalChars.length > 0) {
    errors.push(`包含非法字符: ${illegalChars.join(", ")}`);
  }

  // 2. 字段名称验证
  // 提取可能的字段名（大写字母开头的单词或包含下划线的标识符）
  const fieldPattern = /\b([A-Z_][A-Z0-9_]*)\b/g;
  const possibleFields = logic.match(fieldPattern) || [];

  // 定义已知的有效字段（来自bak_daily_data和stk_factor_pro_data）
  const validFields = [
    // 基础字段
    "CLOSE", "OPEN", "HIGH", "LOW", "VOL", "AMOUNT",
    // MACD相关
    "MACD", "MACD_DIF", "MACD_DEA", "MACD_MACD",
    // KDJ相关
    "KDJ", "J",
    // EMA相关
    "EMA", "EMA_BFQ_5", "EMA_BFQ_10", "EMA_BFQ_20", "EMA_BFQ_30", "EMA_BFQ_60",
    // MA相关
    "MA", "MA_5", "MA_10", "MA_20", "MA_28", "MA_30", "MA_57", "MA_60", "MA_114", "MA_140",
    // 其他技术指标
    "BOLL", "RSI", "ATR", "CCI", "DMI", "BIAS", "ROC", "WR", "SAR",
    // 函数关键字
    "REF", "CROSS", "BARSLAST", "EVERY", "IF", "FROMOPEN", "DATE",
  ];

  // 检查未知字段
  const unknownFields = possibleFields.filter(field => !validFields.includes(field));
  if (unknownFields.length > 0) {
    errors.push(`包含未知字段: ${unknownFields.join(", ")}。请确认这些字段存在于数据表中。`);
  }

  // 3. 运算符验证
  // 检查是否有连续的运算符
  if (/[\+\-\*\/]{2,}/.test(logic) && !/[\+\-]{2}/.test(logic)) { // 允许++和--
    errors.push("存在连续的运算符");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==================== 路由定义 ====================

export const configTagsRouter = router({
  /**
   * 获取所有配置标签
   */
  list: protectedProcedure
    .input(z.object({
      strategyType: z.string().optional(),
      category: z.enum(["plus", "minus"]).optional(),
      tagType: z.enum(["system", "custom"]).optional(),
      isEnabled: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const conditions = [];
      
      if (input?.strategyType) {
        conditions.push(eq(strategyConfigTags.strategyType, input.strategyType));
      }
      if (input?.category) {
        conditions.push(eq(strategyConfigTags.category, input.category));
      }
      if (input?.tagType) {
        conditions.push(eq(strategyConfigTags.tagType, input.tagType));
      }
      if (input?.isEnabled !== undefined) {
        conditions.push(eq(strategyConfigTags.isEnabled, input.isEnabled));
      }

      const tags = await db
        .select()
        .from(strategyConfigTags)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(strategyConfigTags.sortOrder), asc(strategyConfigTags.id));

      return tags;
    }),

  /**
   * 获取单个配置标签
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const [tag] = await db
        .select()
        .from(strategyConfigTags)
        .where(eq(strategyConfigTags.id, input.id))
        .limit(1);

      if (!tag) {
        throw new Error("标签不存在");
      }

      return tag;
    }),

  /**
   * 创建配置标签
   */
  create: protectedProcedure
    .input(createTagSchema)
    .mutation(async ({ input, ctx }) => {
      // 验证计算逻辑
      const validation = validateCalculationLogic(input.calculationLogic);
      if (!validation.valid) {
        throw new Error(`计算逻辑验证失败: ${validation.errors.join("; ")}`);
      }

      // 插入标签
      const [result] = await db.insert(strategyConfigTags).values({
        name: input.name,
        meaning: input.meaning,
        calculationLogic: input.calculationLogic,
        category: input.category,
        tagType: "custom", // 用户创建的标签都是自定义标签
        strategyType: input.strategyType,
        sortOrder: input.sortOrder,
        isEnabled: true,
        createdBy: ctx.user.name || ctx.user.email || "unknown",
      });

      // 记录日志
      await logOperation(
        result.insertId,
        input.name,
        "create",
        ctx.user.name || ctx.user.email || "unknown",
        null,
        input,
        "创建新标签"
      );

      return { id: result.insertId, success: true };
    }),

  /**
   * 更新配置标签
   */
  update: protectedProcedure
    .input(updateTagSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;

      // 获取原标签信息
      const [oldTag] = await db
        .select()
        .from(strategyConfigTags)
        .where(eq(strategyConfigTags.id, id))
        .limit(1);

      if (!oldTag) {
        throw new Error("标签不存在");
      }

      // 系统标签不允许修改某些字段
      if (oldTag.tagType === "system") {
        if (updates.name || updates.strategyType || updates.category) {
          throw new Error("系统标签不允许修改名称、战法类型和分类");
        }
      }

      // 如果更新了计算逻辑，需要验证
      if (updates.calculationLogic) {
        const validation = validateCalculationLogic(updates.calculationLogic);
        if (!validation.valid) {
          throw new Error(`计算逻辑验证失败: ${validation.errors.join("; ")}`);
        }
      }

      // 更新标签
      await db
        .update(strategyConfigTags)
        .set(updates)
        .where(eq(strategyConfigTags.id, id));

      // 记录日志
      await logOperation(
        id,
        oldTag.name,
        "update",
        ctx.user.name || ctx.user.email || "unknown",
        oldTag,
        { ...oldTag, ...updates },
        "更新标签"
      );

      return { success: true };
    }),

  /**
   * 删除配置标签
   */
  delete: protectedProcedure
    .input(deleteTagSchema)
    .mutation(async ({ input, ctx }) => {
      // 获取标签信息
      const [tag] = await db
        .select()
        .from(strategyConfigTags)
        .where(eq(strategyConfigTags.id, input.id))
        .limit(1);

      if (!tag) {
        throw new Error("标签不存在");
      }

      // 系统标签不允许删除
      if (tag.tagType === "system") {
        throw new Error("系统标签不允许删除");
      }

      // 删除标签
      await db
        .delete(strategyConfigTags)
        .where(eq(strategyConfigTags.id, input.id));

      // 记录日志
      await logOperation(
        input.id,
        tag.name,
        "delete",
        ctx.user.name || ctx.user.email || "unknown",
        tag,
        null,
        "删除标签"
      );

      return { success: true };
    }),

  /**
   * 启用/禁用配置标签
   */
  toggleEnabled: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      isEnabled: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 获取标签信息
      const [tag] = await db
        .select()
        .from(strategyConfigTags)
        .where(eq(strategyConfigTags.id, input.id))
        .limit(1);

      if (!tag) {
        throw new Error("标签不存在");
      }

      // 更新状态
      await db
        .update(strategyConfigTags)
        .set({ isEnabled: input.isEnabled })
        .where(eq(strategyConfigTags.id, input.id));

      // 记录日志
      await logOperation(
        input.id,
        tag.name,
        input.isEnabled ? "enable" : "disable",
        ctx.user.name || ctx.user.email || "unknown",
        { isEnabled: tag.isEnabled },
        { isEnabled: input.isEnabled },
        input.isEnabled ? "启用标签" : "禁用标签"
      );

      return { success: true };
    }),

  /**
   * 批量重新排序
   */
  reorder: protectedProcedure
    .input(reorderTagsSchema)
    .mutation(async ({ input, ctx }) => {
      // 批量更新排序
      for (let i = 0; i < input.tagIds.length; i++) {
        await db
          .update(strategyConfigTags)
          .set({ sortOrder: i })
          .where(eq(strategyConfigTags.id, input.tagIds[i]));
      }

      // 记录日志
      await logOperation(
        null,
        "批量排序",
        "reorder",
        ctx.user.name || ctx.user.email || "unknown",
        null,
        { tagIds: input.tagIds },
        "重新排序标签"
      );

      return { success: true };
    }),

  /**
   * 验证计算逻辑
   */
  validateLogic: protectedProcedure
    .input(validateLogicSchema)
    .mutation(async ({ input }) => {
      const validation = validateCalculationLogic(input.calculationLogic);
      return validation;
    }),
});
