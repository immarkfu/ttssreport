import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getUserConfig: vi.fn(),
  upsertUserConfig: vi.fn(),
  getDefaultConfig: vi.fn(() => ({
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
  })),
}));

import { getUserConfig, upsertUserConfig } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("config.get", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing user config when found", async () => {
    const mockConfig = {
      id: 1,
      userId: 1,
      b1JValueThreshold: 15,
      b1MacdCondition: 'MACD>0',
      b1VolumeRatio: '1.5',
      b1RedGreenCondition: true,
      s1WhiteLineBreak: true,
      s1LongYangFly: true,
      s1JValueHigh: 90,
      s1VolumeCondition: true,
      watchlistStocks: null,
      excludedIndustries: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(getUserConfig).mockResolvedValue(mockConfig);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.config.get();

    expect(result).toEqual(mockConfig);
    expect(getUserConfig).toHaveBeenCalledWith(1);
  });

  it("returns default config when no config exists", async () => {
    vi.mocked(getUserConfig).mockResolvedValue(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.config.get();

    expect(result.b1JValueThreshold).toBe(13);
    expect(result.s1JValueHigh).toBe(85);
    expect(getUserConfig).toHaveBeenCalledWith(1);
  });
});

describe("config.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates user config with valid input", async () => {
    const updatedConfig = {
      id: 1,
      userId: 1,
      b1JValueThreshold: 20,
      b1MacdCondition: 'MACD>0',
      b1VolumeRatio: '2.0',
      b1RedGreenCondition: false,
      s1WhiteLineBreak: true,
      s1LongYangFly: true,
      s1JValueHigh: 80,
      s1VolumeCondition: true,
      watchlistStocks: '000001,600000',
      excludedIndustries: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(upsertUserConfig).mockResolvedValue(updatedConfig);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.config.update({
      b1JValueThreshold: 20,
      b1VolumeRatio: '2.0',
      b1RedGreenCondition: false,
      s1JValueHigh: 80,
      watchlistStocks: '000001,600000',
    });

    expect(result).toEqual(updatedConfig);
    expect(upsertUserConfig).toHaveBeenCalledWith(1, expect.objectContaining({
      b1JValueThreshold: 20,
      b1VolumeRatio: '2.0',
    }));
  });
});

describe("config.reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets config to default values", async () => {
    const defaultConfig = {
      id: 1,
      userId: 1,
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(upsertUserConfig).mockResolvedValue(defaultConfig);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.config.reset();

    expect(result).toEqual(defaultConfig);
    expect(upsertUserConfig).toHaveBeenCalledWith(1, expect.objectContaining({
      b1JValueThreshold: 13,
      s1JValueHigh: 85,
    }));
  });
});
