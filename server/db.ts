import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, userConfigs, InsertUserConfig, UserConfig } from "../drizzle/schema";
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
