import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  REDIS_URL: z.string().optional(),

  DEEPL_API_KEY: z.string().optional(),
  DEEPL_API_URL: z
    .string()
    .url()
    .default("https://api-free.deepl.com/v2"),

  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:5173,chrome-extension://")
    .transform((s) => s.split(",")),
});

function loadConfig() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
export type Config = typeof config;
