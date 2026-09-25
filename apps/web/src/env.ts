import { z } from 'zod';

/**
 * Every environment variable the web app reads, validated with Zod.
 * Keep .env.example in sync. Local values come from the root .env.local
 * (written by `neon link`); Vercel and CI provide them as platform variables.
 */
const optional = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
    /** Pooled Neon connection string for the `Doulisha` database. */
    DATABASE_URL: z
      .url()
      .refine((v) => !/\/neondb\?/.test(v), 'Points at "neondb"; run `pnpm db:use-doulisha`.'),
    BETTER_AUTH_SECRET: z.string().min(32, 'Generate one with `openssl rand -base64 32`.'),
    BETTER_AUTH_URL: z.url().optional(),
    /** Development and tests always use mocks (CLAUDE.md). Real providers arrive in Phase 6. */
    SMS_PROVIDER: z.enum(['mock']).default('mock'),
    EMAIL_PROVIDER: z.enum(['mock']).default('mock'),
    /** Online payments: the simulated gateway until Konnect/Flouci (Phase 6). */
    PAYMENT_PROVIDER: z.enum(['mock']).default('mock'),
    /** File storage: local disk in development, Cloudflare R2 in Phase 6. */
    STORAGE_PROVIDER: z.enum(['local']).default('local'),
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,
    FACEBOOK_CLIENT_ID: optional,
    FACEBOOK_CLIENT_SECRET: optional,
    APPLE_CLIENT_ID: optional,
    APPLE_CLIENT_SECRET: optional,
  })
  .transform((env) => ({
    ...env,
    BETTER_AUTH_URL: env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL,
  }));

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

/**
 * Parses and caches the environment on first use, so builds that never touch
 * the database (CI) do not need database secrets.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}

/** Social providers whose credentials are configured (ACC-01). */
export function configuredSocialProviders(env: ServerEnv) {
  const pair = (id?: string, secret?: string) =>
    id && secret ? { clientId: id, clientSecret: secret } : undefined;
  return {
    google: pair(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET),
    facebook: pair(env.FACEBOOK_CLIENT_ID, env.FACEBOOK_CLIENT_SECRET),
    apple: pair(env.APPLE_CLIENT_ID, env.APPLE_CLIENT_SECRET),
  };
}
