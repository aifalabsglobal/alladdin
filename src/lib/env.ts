import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_DAILY_TOKEN_BUDGET: z.coerce.number().int().positive().default(500_000),
  COINGECKO_API_KEY: z.string().optional(),
  TWELVE_DATA_API_KEY: z.string().optional(),
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  MARKET_BASE_CURRENCY: z.string().length(3).default("USD"),
  ENABLE_YAHOO_PROTOTYPE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  CRON_SECRET: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_DAILY_TOKEN_BUDGET: process.env.OPENAI_DAILY_TOKEN_BUDGET,
    COINGECKO_API_KEY: process.env.COINGECKO_API_KEY,
    TWELVE_DATA_API_KEY: process.env.TWELVE_DATA_API_KEY,
    ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY,
    MARKET_BASE_CURRENCY: process.env.MARKET_BASE_CURRENCY,
    ENABLE_YAHOO_PROTOTYPE: process.env.ENABLE_YAHOO_PROTOTYPE,
    CRON_SECRET: process.env.CRON_SECRET,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Invalid server environment: ${message}`);
  }

  cached = parsed.data;
  return cached;
}
