import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 用户D战法配置表
 * 存储每个用户的个性化D战法参数配置
 */
export const userConfigs = mysqlTable("user_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // B1观察条件配置
  b1JValueThreshold: int("b1JValueThreshold").default(13).notNull(), // J值阈值
  b1MacdCondition: varchar("b1MacdCondition", { length: 32 }).default("MACD>0").notNull(), // MACD条件
  b1VolumeRatio: varchar("b1VolumeRatio", { length: 32 }).default("1.0").notNull(), // 量比阈值
  b1RedGreenCondition: boolean("b1RedGreenCondition").default(true).notNull(), // 红肥绿瘦
  
  // S1卖出条件配置
  s1WhiteLineBreak: boolean("s1WhiteLineBreak").default(true).notNull(), // 跌破白线
  s1LongYangFly: boolean("s1LongYangFly").default(true).notNull(), // 长阳放飞
  s1JValueHigh: int("s1JValueHigh").default(85).notNull(), // J值高位阈值
  s1VolumeCondition: boolean("s1VolumeCondition").default(true).notNull(), // 放量条件
  
  // 监控池配置 - 使用text存储JSON字符串
  watchlistStocks: text("watchlistStocks"), // 自选股列表 JSON字符串
  excludedIndustries: text("excludedIndustries"), // 排除行业 JSON字符串
  backtestPool: text("backtestPool"), // 回测池股票代码 JSON字符串
  
  // 时间戳
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserConfig = typeof userConfigs.$inferSelect;
export type InsertUserConfig = typeof userConfigs.$inferInsert;
