/**
 * 股票筛选 tRPC 路由
 * 提供基于标签的股票筛选和排序功能
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '../db';
import { 
  stockTagResults, 
  stockTagSummary, 
  strategyConfigTags 
} from '../../drizzle/schema_stock_tags';
import { bakDailyData } from '../../drizzle/schema';
import { eq, and, inArray, desc, asc, sql } from 'drizzle-orm';

export const stockFilterRouter = router({
  /**
   * 获取最新交易日期
   */
  getLatestTradeDate: protectedProcedure
    .query(async () => {
      const result = await db
        .select({ latestDate: sql<string>`MAX(${bakDailyData.tradeDate})` })
        .from(bakDailyData);
      
      return result[0]?.latestDate || null;
    }),

  /**
   * 获取可用的标签列表
   */
  getAvailableTags: protectedProcedure
    .input(z.object({
      strategyType: z.enum(['B1', 'S1']).default('B1'),
      category: z.enum(['plus', 'minus']).optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(strategyConfigTags.strategyType, input.strategyType),
        eq(strategyConfigTags.isEnabled, true),
      ];

      if (input.category) {
        conditions.push(eq(strategyConfigTags.category, input.category));
      }

      const tags = await db
        .select({
          id: strategyConfigTags.id,
          name: strategyConfigTags.name,
          meaning: strategyConfigTags.meaning,
          category: strategyConfigTags.category,
          tagType: strategyConfigTags.tagType,
          sortOrder: strategyConfigTags.sortOrder,
        })
        .from(strategyConfigTags)
        .where(and(...conditions))
        .orderBy(asc(strategyConfigTags.sortOrder));

      return tags;
    }),

  /**
   * 获取筛选后的股票列表
   */
  getFilteredStocks: protectedProcedure
    .input(z.object({
      strategyType: z.enum(['B1', 'S1']).default('B1'),
      tagIds: z.array(z.number()).optional(),
      logicType: z.enum(['AND', 'OR']).default('AND'),
      sortBy: z.enum(['tagCount', 'tagScore', 'pctChange']).default('tagScore'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      page: z.number().default(1),
      pageSize: z.number().default(50),
      tradeDate: z.string().optional(), // 格式：YYYYMMDD
    }))
    .query(async ({ input }) => {
      const { 
        strategyType, 
        tagIds, 
        logicType, 
        sortBy, 
        sortOrder: sortOrderInput, 
        page, 
        pageSize,
        tradeDate 
      } = input;

      // 获取交易日期（如果未指定，则使用最新交易日）
      let targetDate = tradeDate;
      if (!targetDate) {
        const latestDateResult = await db
          .select({ latestDate: sql<string>`MAX(${stockTagSummary.tradeDate})` })
          .from(stockTagSummary);
        targetDate = latestDateResult[0]?.latestDate || '';
      }

      if (!targetDate) {
        return {
          stocks: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        };
      }

      // 基础查询条件
      const baseConditions = [
        eq(stockTagSummary.tradeDate, targetDate),
        eq(stockTagSummary.strategyType, strategyType),
      ];

      // 如果指定了标签筛选
      let filteredStocks: any[] = [];
      
      if (tagIds && tagIds.length > 0) {
        if (logicType === 'AND') {
          // AND逻辑：必须同时满足所有标签
          // 使用子查询统计每只股票满足的标签数
          const stocksWithTagCount = await db
            .select({
              tsCode: stockTagResults.tsCode,
              matchedCount: sql<number>`COUNT(DISTINCT ${stockTagResults.tagId})`,
            })
            .from(stockTagResults)
            .where(
              and(
                eq(stockTagResults.tradeDate, targetDate),
                eq(stockTagResults.strategyType, strategyType),
                inArray(stockTagResults.tagId, tagIds),
                eq(stockTagResults.tagValue, true)
              )
            )
            .groupBy(stockTagResults.tsCode)
            .having(sql`COUNT(DISTINCT ${stockTagResults.tagId}) = ${tagIds.length}`);

          const matchedTsCodes = stocksWithTagCount.map(s => s.tsCode);

          if (matchedTsCodes.length === 0) {
            return {
              stocks: [],
              total: 0,
              page,
              pageSize,
              totalPages: 0,
            };
          }

          baseConditions.push(inArray(stockTagSummary.tsCode, matchedTsCodes));
        } else {
          // OR逻辑：满足任意一个标签即可
          const stocksWithAnyTag = await db
            .select({
              tsCode: stockTagResults.tsCode,
            })
            .from(stockTagResults)
            .where(
              and(
                eq(stockTagResults.tradeDate, targetDate),
                eq(stockTagResults.strategyType, strategyType),
                inArray(stockTagResults.tagId, tagIds),
                eq(stockTagResults.tagValue, true)
              )
            )
            .groupBy(stockTagResults.tsCode);

          const matchedTsCodes = stocksWithAnyTag.map(s => s.tsCode);

          if (matchedTsCodes.length === 0) {
            return {
              stocks: [],
              total: 0,
              page,
              pageSize,
              totalPages: 0,
            };
          }

          baseConditions.push(inArray(stockTagSummary.tsCode, matchedTsCodes));
        }
      }

      // 排序字段映射
      const sortFieldMap = {
        tagCount: stockTagSummary.matchedTags,
        tagScore: stockTagSummary.tagScore,
        pctChange: stockTagSummary.pctChange,
      };

      const sortField = sortFieldMap[sortBy];
      const orderFn = sortOrderInput === 'desc' ? desc : asc;

      // 查询总数
      const totalResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(stockTagSummary)
        .where(and(...baseConditions));

      const total = totalResult[0]?.count || 0;
      const totalPages = Math.ceil(total / pageSize);

      // 查询分页数据
      const stocks = await db
        .select({
          tsCode: stockTagSummary.tsCode,
          stockName: stockTagSummary.stockName,
          tradeDate: stockTagSummary.tradeDate,
          strategyType: stockTagSummary.strategyType,
          totalTags: stockTagSummary.totalTags,
          matchedTags: stockTagSummary.matchedTags,
          plusTags: stockTagSummary.plusTags,
          minusTags: stockTagSummary.minusTags,
          tagScore: stockTagSummary.tagScore,
          matchedTagIds: stockTagSummary.matchedTagIds,
          matchedTagNames: stockTagSummary.matchedTagNames,
          currentPrice: stockTagSummary.currentPrice,
          priceChange: stockTagSummary.priceChange,
          pctChange: stockTagSummary.pctChange,
          volume: stockTagSummary.volume,
          amount: stockTagSummary.amount,
          totalMv: stockTagSummary.totalMv,
        })
        .from(stockTagSummary)
        .where(and(...baseConditions))
        .orderBy(orderFn(sortField))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      return {
        stocks,
        total,
        page,
        pageSize,
        totalPages,
        tradeDate: targetDate,
      };
    }),

  /**
   * 获取单只股票的标签详情
   */
  getStockTagDetails: protectedProcedure
    .input(z.object({
      tsCode: z.string(),
      tradeDate: z.string(), // 格式：YYYYMMDD
      strategyType: z.enum(['B1', 'S1']).default('B1'),
    }))
    .query(async ({ input }) => {
      const { tsCode, tradeDate, strategyType } = input;

      // 获取标签结果
      const tagResults = await db
        .select({
          tagId: stockTagResults.tagId,
          tagName: stockTagResults.tagName,
          tagValue: stockTagResults.tagValue,
          category: stockTagResults.category,
          meaning: strategyConfigTags.meaning,
          sortOrder: strategyConfigTags.sortOrder,
        })
        .from(stockTagResults)
        .leftJoin(
          strategyConfigTags,
          eq(stockTagResults.tagId, strategyConfigTags.id)
        )
        .where(
          and(
            eq(stockTagResults.tsCode, tsCode),
            eq(stockTagResults.tradeDate, tradeDate),
            eq(stockTagResults.strategyType, strategyType)
          )
        )
        .orderBy(asc(strategyConfigTags.sortOrder));

      // 获取股票基本信息
      const stockInfo = await db
        .select()
        .from(stockTagSummary)
        .where(
          and(
            eq(stockTagSummary.tsCode, tsCode),
            eq(stockTagSummary.tradeDate, tradeDate),
            eq(stockTagSummary.strategyType, strategyType)
          )
        )
        .limit(1);

      return {
        stockInfo: stockInfo[0] || null,
        tagResults,
      };
    }),

  /**
   * 获取标签统计信息
   */
  getTagStatistics: protectedProcedure
    .input(z.object({
      strategyType: z.enum(['B1', 'S1']).default('B1'),
      tradeDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { strategyType, tradeDate } = input;

      // 获取交易日期
      let targetDate = tradeDate;
      if (!targetDate) {
        const latestDateResult = await db
          .select({ latestDate: sql<string>`MAX(${stockTagResults.tradeDate})` })
          .from(stockTagResults);
        targetDate = latestDateResult[0]?.latestDate || '';
      }

      if (!targetDate) {
        return [];
      }

      // 统计每个标签的匹配数量
      const statistics = await db
        .select({
          tagId: stockTagResults.tagId,
          tagName: stockTagResults.tagName,
          category: stockTagResults.category,
          totalStocks: sql<number>`COUNT(*)`,
          matchedStocks: sql<number>`SUM(CASE WHEN ${stockTagResults.tagValue} = TRUE THEN 1 ELSE 0 END)`,
          matchRate: sql<number>`ROUND(SUM(CASE WHEN ${stockTagResults.tagValue} = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2)`,
        })
        .from(stockTagResults)
        .where(
          and(
            eq(stockTagResults.tradeDate, targetDate),
            eq(stockTagResults.strategyType, strategyType)
          )
        )
        .groupBy(stockTagResults.tagId, stockTagResults.tagName, stockTagResults.category)
        .orderBy(desc(sql`matchedStocks`));

      return statistics;
    }),

  /**
   * 触发标签计算（手动）
   */
  triggerTagCalculation: protectedProcedure
    .input(z.object({
      tradeDate: z.string().optional(), // 如果不指定，则计算最新交易日
    }))
    .mutation(async ({ input }) => {
      // 这里调用Python标签计算引擎
      // 实际实现需要通过子进程或消息队列调用
      // 这里只是返回一个模拟结果
      
      return {
        success: true,
        message: '标签计算任务已提交',
        tradeDate: input.tradeDate || 'latest',
      };
    }),
});
