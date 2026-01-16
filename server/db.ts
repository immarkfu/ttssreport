import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, userConfigs, InsertUserConfig, UserConfig, observationPool, InsertObservationPool } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ 用户配置相关操作 ============

/**
 * 获取用户的D战法配置
 */
export async function getUserConfig(userId: number): Promise<UserConfig | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user config: database not available");
    return undefined;
  }

  const result = await db.select().from(userConfigs).where(eq(userConfigs.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * 创建或更新用户的D战法配置
 */
export async function upsertUserConfig(userId: number, config: Partial<InsertUserConfig>): Promise<UserConfig | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user config: database not available");
    return undefined;
  }

  try {
    // 检查是否已存在配置
    const existing = await getUserConfig(userId);
    
    if (existing) {
      // 更新现有配置
      await db.update(userConfigs)
        .set({
          ...config,
          updatedAt: new Date(),
        })
        .where(eq(userConfigs.userId, userId));
    } else {
      // 创建新配置
      await db.insert(userConfigs).values({
        userId,
        ...config,
      });
    }

    // 返回更新后的配置
    return await getUserConfig(userId);
  } catch (error) {
    console.error("[Database] Failed to upsert user config:", error);
    throw error;
  }
}

/**
 * 获取默认配置
 */
export function getDefaultConfig(): Omit<InsertUserConfig, 'userId'> {
  return {
    b1JValueThreshold: 13,
    b1MacdCondition: 'MACD>0',
    b1VolumeRatio: '1.0',
    b1RedGreenCondition: true,
    s1WhiteLineBreak: true,
    s1LongYangFly: true,
    s1JValueHigh: 85,
    s1VolumeCondition: true,
    watchlistStocks: null,
    excludedIndustries: null,
  };
}

// ============ 观察池相关操作 ============

interface ObservationPoolStock {
  code: string;
  name: string;
  industry: string;
  addedDate: string;
  addedPrice: number;
  displayFactors: string[];
}

/**
 * 获取用户的观察池股票列表
 */
export async function getObservationPool(userId: number): Promise<ObservationPoolStock[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get observation pool: database not available");
    return [];
  }

  try {
    const result = await db.select().from(observationPool).where(eq(observationPool.userId, userId));
    
    // 解析displayFactors JSON字符串
    return result.map(row => ({
      code: row.code,
      name: row.name,
      industry: row.industry,
      addedDate: row.addedDate,
      addedPrice: row.addedPrice / 100, // 从分转换为元
      displayFactors: row.displayFactors ? JSON.parse(row.displayFactors) : [],
    }));
  } catch (error) {
    console.error("[Database] Failed to get observation pool:", error);
    return [];
  }
}

/**
 * 加入观察池
 */
export async function addToObservationPool(
  userId: number,
  stock: Omit<ObservationPoolStock, 'addedDate'>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add to observation pool: database not available");
    return;
  }

  try {
    const addedDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式
    const values: InsertObservationPool = {
      userId,
      code: stock.code,
      name: stock.name,
      industry: stock.industry,
      addedDate,
      addedPrice: Math.round(stock.addedPrice * 100), // 从元转换为分
      displayFactors: JSON.stringify(stock.displayFactors),
    };

    await db.insert(observationPool).values(values).onDuplicateKeyUpdate({
      set: {
        name: stock.name,
        industry: stock.industry,
        addedPrice: Math.round(stock.addedPrice * 100), // 从元转换为分
        displayFactors: JSON.stringify(stock.displayFactors),
      },
    });
  } catch (error) {
    console.error("[Database] Failed to add to observation pool:", error);
    throw error;
  }
}

/**
 * 移出观察池
 */
export async function removeFromObservationPool(userId: number, code: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot remove from observation pool: database not available");
    return;
  }

  try {
    await db.delete(observationPool).where(
      eq(observationPool.userId, userId) && eq(observationPool.code, code)
    );
  } catch (error) {
    console.error("[Database] Failed to remove from observation pool:", error);
    throw error;
  }
}
