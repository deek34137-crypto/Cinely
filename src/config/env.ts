import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().optional(),
  USE_SQLITE_MEM: z.coerce.boolean().default(true), // Default to SQLite in-memory for testing / dev without external PG
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(20),
  DATABASE_CONNECTION_TIMEOUT_MS: z.coerce.number().default(5000),
  REDIS_URL: z.string().optional(),
  CINELY_MASTER_KEY: z.string().default("cinely-dev-master-key-32byteslong!"),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001"),
  TMDB_API_KEY: z.string().optional(),
  FAST_RESOLUTION_WINDOW_MS: z.coerce.number().default(2500),
  HARD_RESOLUTION_CEILING_MS: z.coerce.number().default(8000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .optional()
}).refine(
  (data) => {
    // In production, enforce strong master key (at least 32 characters)
    if (data.NODE_ENV === "production" && data.CINELY_MASTER_KEY.length < 32) {
      return false;
    }
    return true;
  },
  {
    message: "CINELY_MASTER_KEY must be at least 32 characters in production",
    path: ["CINELY_MASTER_KEY"]
  }
);

export type AppConfig = z.infer<typeof envSchema>;

export function parseAllowedOrigins(originsStr: string): string[] {
  return originsStr
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function loadConfig(envOverrides?: Record<string, unknown>): AppConfig {
  const source = envOverrides || process.env;
  const result = envSchema.safeParse(source);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.format());
    throw new Error("Configuration validation failed: " + JSON.stringify(result.error.format()));
  }
  return result.data;
}

export const config = loadConfig();
