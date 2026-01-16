import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getUserConfig, upsertUserConfig, getDefaultConfig } from "./db";
import { z } from "zod";

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
  }),
});

export type AppRouter = typeof appRouter;
