/**
 * 股票标签相关的数据库schema定义
 */

import { 
  mysqlTable, 
  bigint, 
  varchar, 
  date, 
  int, 
  boolean, 
  timestamp, 
  decimal,
  json,
  index,
  uniqueIndex,
} from 'drizzle-orm/mysql-core';

/**
 * 股票标签结果表
 */
export const stockTagResults = mysqlTable('stock_tag_results', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  tsCode: varchar('ts_code', { length: 20 }).notNull(),
  stockName: varchar('stock_name', { length: 100 }),
  tradeDate: date('trade_date').notNull(),
  tagId: int('tag_id').notNull(),
  tagName: varchar('tag_name', { length: 100 }).notNull(),
  tagValue: boolean('tag_value').notNull().default(false),
  strategyType: varchar('strategy_type', { length: 50 }).notNull(),
  category: varchar('category', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  // 唯一索引
  ukStockTagDate: uniqueIndex('uk_stock_tag_date').on(table.tsCode, table.tradeDate, table.tagId),
  // 查询优化索引
  idxTradeDate: index('idx_trade_date').on(table.tradeDate),
  idxTsCode: index('idx_ts_code').on(table.tsCode),
  idxTagId: index('idx_tag_id').on(table.tagId),
  idxStrategyType: index('idx_strategy_type').on(table.strategyType),
  idxTagValue: index('idx_tag_value').on(table.tagValue),
  idxCreatedAt: index('idx_created_at').on(table.createdAt),
  // 组合索引
  idxDateStrategyValue: index('idx_date_strategy_value').on(table.tradeDate, table.strategyType, table.tagValue),
}));

/**
 * 股票标签汇总表
 */
export const stockTagSummary = mysqlTable('stock_tag_summary', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  tsCode: varchar('ts_code', { length: 20 }).notNull(),
  stockName: varchar('stock_name', { length: 100 }),
  tradeDate: date('trade_date').notNull(),
  strategyType: varchar('strategy_type', { length: 50 }).notNull(),
  
  // 标签统计
  totalTags: int('total_tags').default(0),
  matchedTags: int('matched_tags').default(0),
  plusTags: int('plus_tags').default(0),
  minusTags: int('minus_tags').default(0),
  tagScore: int('tag_score').default(0),
  
  // 匹配的标签列表
  matchedTagIds: json('matched_tag_ids').$type<number[]>(),
  matchedTagNames: json('matched_tag_names').$type<string[]>(),
  
  // 股票基本信息
  currentPrice: decimal('current_price', { precision: 10, scale: 2 }),
  priceChange: decimal('price_change', { precision: 10, scale: 2 }),
  pctChange: decimal('pct_change', { precision: 10, scale: 4 }),
  volume: bigint('volume', { mode: 'number' }),
  amount: decimal('amount', { precision: 20, scale: 2 }),
  totalMv: decimal('total_mv', { precision: 20, scale: 2 }),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  // 唯一索引
  ukStockDateStrategy: uniqueIndex('uk_stock_date_strategy').on(table.tsCode, table.tradeDate, table.strategyType),
  // 查询优化索引
  idxTradeDate: index('idx_trade_date').on(table.tradeDate),
  idxStrategyType: index('idx_strategy_type').on(table.strategyType),
  idxMatchedTags: index('idx_matched_tags').on(table.matchedTags),
  idxTagScore: index('idx_tag_score').on(table.tagScore),
  idxPctChange: index('idx_pct_change').on(table.pctChange),
  // 组合索引
  idxDateStrategyScore: index('idx_date_strategy_score').on(table.tradeDate, table.strategyType, table.tagScore),
}));

/**
 * 标签计算日志表
 */
export const stockTagCalculationLog = mysqlTable('stock_tag_calculation_log', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  tradeDate: date('trade_date').notNull(),
  strategyType: varchar('strategy_type', { length: 50 }).notNull(),
  tagId: int('tag_id'),
  tagName: varchar('tag_name', { length: 100 }),
  
  // 计算统计
  totalStocks: int('total_stocks').default(0),
  calculatedStocks: int('calculated_stocks').default(0),
  matchedStocks: int('matched_stocks').default(0),
  failedStocks: int('failed_stocks').default(0),
  
  // 执行信息
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  durationSeconds: int('duration_seconds'),
  errorMessage: varchar('error_message', { length: 1000 }),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  idxTradeDate: index('idx_trade_date').on(table.tradeDate),
  idxStatus: index('idx_status').on(table.status),
  idxCreatedAt: index('idx_created_at').on(table.createdAt),
}));

/**
 * 类型导出
 */
export type StockTagResult = typeof stockTagResults.$inferSelect;
export type NewStockTagResult = typeof stockTagResults.$inferInsert;

export type StockTagSummary = typeof stockTagSummary.$inferSelect;
export type NewStockTagSummary = typeof stockTagSummary.$inferInsert;

export type StockTagCalculationLog = typeof stockTagCalculationLog.$inferSelect;
export type NewStockTagCalculationLog = typeof stockTagCalculationLog.$inferInsert;
