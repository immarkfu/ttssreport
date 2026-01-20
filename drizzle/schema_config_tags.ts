import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * 战法配置标签表
 * 用于管理少妇战法（B1/S1）的配置标签
 */
export const strategyConfigTags = mysqlTable("strategy_config_tags", {
  id: int("id").autoincrement().primaryKey(),
  
  // 基本信息
  name: varchar("name", { length: 100 }).notNull(),
  meaning: text("meaning").notNull(),
  calculationLogic: text("calculation_logic").notNull(),
  
  // 分类信息
  category: mysqlEnum("category", ["plus", "minus"]).notNull(), // plus=加分项, minus=减分项
  tagType: mysqlEnum("tag_type", ["system", "custom"]).default("custom").notNull(), // system=系统标签, custom=自定义标签
  strategyType: varchar("strategy_type", { length: 50 }).notNull(), // B1, S1等
  
  // 排序和状态
  sortOrder: int("sort_order").default(0).notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  
  // 审计信息
  createdBy: varchar("created_by", { length: 100 }).default("system"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type StrategyConfigTag = typeof strategyConfigTags.$inferSelect;
export type InsertStrategyConfigTag = typeof strategyConfigTags.$inferInsert;

/**
 * 配置标签操作日志表
 * 记录所有对配置标签的操作
 */
export const strategyConfigTagLogs = mysqlTable("strategy_config_tag_logs", {
  id: int("id").autoincrement().primaryKey(),
  
  // 操作信息
  tagId: int("tag_id"),
  tagName: varchar("tag_name", { length: 100 }).notNull(),
  operationType: mysqlEnum("operation_type", ["create", "update", "delete", "enable", "disable", "reorder"]).notNull(),
  
  // 变更内容
  oldValue: text("old_value"),
  newValue: text("new_value"),
  
  // 操作人信息
  operatedBy: varchar("operated_by", { length: 100 }).notNull(),
  operatedAt: timestamp("operated_at").defaultNow().notNull(),
  
  // 其他信息
  remark: text("remark"),
});

export type StrategyConfigTagLog = typeof strategyConfigTagLogs.$inferSelect;
export type InsertStrategyConfigTagLog = typeof strategyConfigTagLogs.$inferInsert;
