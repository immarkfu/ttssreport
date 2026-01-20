import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getUserConfig, upsertUserConfig, getDefaultConfig, getObservationPool, addToObservationPool, removeFromObservationPool } from "./db";
import { z } from "zod";
import { configTagsRouter } from "./routers/configTags";
import { stockFilterRouter } from "./routers/stockFilter";

// 用户配置输入验证schema
const userConfigInput = z.object({
  b1JValueThreshold: z.number().min(0).max(100).optional(),
  b1MacdCondition: z.string().max(32).optional(),
  b1VolumeRatio: z.string().max(32).optional(),
  b1RedGreenCondition: z.boolean().optional(),
  s1WhiteLineBreak: z.boolean().optional(),
  s1LongYangFly: z.boolean().optional(),
  s1JValueHigh: z.number().min(0).max(100).optional(),
  s1VolumeCondition: z.boolean().optional(),
  watchlistStocks: z.string().nullable().optional(),
  excludedIndustries: z.string().nullable().optional(),
});

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 用户D战法配置路由
  config: router({
    // 获取当前用户的配置
    get: protectedProcedure.query(async ({ ctx }) => {
      const config = await getUserConfig(ctx.user.id);
      if (config) {
        return config;
      }
      // 返回默认配置
      return {
        id: 0,
        userId: ctx.user.id,
        ...getDefaultConfig(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),

    // 更新当前用户的配置
    update: protectedProcedure
      .input(userConfigInput)
      .mutation(async ({ ctx, input }) => {
        const updatedConfig = await upsertUserConfig(ctx.user.id, input);
        return updatedConfig;
      }),

    // 重置为默认配置
    reset: protectedProcedure.mutation(async ({ ctx }) => {
      const defaultConfig = getDefaultConfig();
      const updatedConfig = await upsertUserConfig(ctx.user.id, defaultConfig);
      return updatedConfig;
    }),

    // 获取回测池股票列表
    getBacktestPool: protectedProcedure.query(async ({ ctx }) => {
      const config = await getUserConfig(ctx.user.id);
      if (config?.backtestPool) {
        try {
          return JSON.parse(config.backtestPool) as string[];
        } catch {
          return [];
        }
      }
      return [];
    }),

    // 保存回测池股票列表
    saveBacktestPool: protectedProcedure
      .input(z.object({ codes: z.array(z.string()) }))
      .mutation(async ({ ctx, input }) => {
        await upsertUserConfig(ctx.user.id, {
          backtestPool: JSON.stringify(input.codes),
        });
        return { success: true };
      }),
  }),

  // 配置标签管理路由
  configTags: configTagsRouter,

  // 股票筛选路由
  stockFilter: stockFilterRouter,

  // 观察池路由（用户个性化数据）
  observation: router({
    // 获取当前用户的观察池
    getMyPool: protectedProcedure.query(async ({ ctx }) => {
      return await getObservationPool(ctx.user.id);
    }),

    // 加入观察池
    addToPool: protectedProcedure
      .input(z.object({
        code: z.string(),
        name: z.string(),
        industry: z.string(),
        addedPrice: z.number(),
        displayFactors: z.array(z.string()),
      }))
      .mutation(async ({ ctx, input }) => {
        await addToObservationPool(ctx.user.id, input);
        return { success: true };
      }),

    // 移出观察池
    removeFromPool: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await removeFromObservationPool(ctx.user.id, input.code);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
