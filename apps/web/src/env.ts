import { z } from 'zod';

/**
 * Every environment variable the web app reads is declared and validated here.
 * Keep .env.example in sync when you add one.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
});

const parsed = schema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

if (!parsed.success) {
  console.error('Invalid environment variables:', z.prettifyError(parsed.error));
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
