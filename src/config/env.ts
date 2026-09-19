import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.url().default('http://localhost:4000/api/v1'),
  VITE_GOOGLE_CLIENT_ID: z.string().trim().default(''),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error('Invalid frontend environment configuration', parsed.error.flatten());
  throw new Error('Invalid frontend environment configuration');
}

export const env = {
  apiBaseUrl: parsed.data.VITE_API_BASE_URL.replace(/\/$/, ''),
  googleClientId: parsed.data.VITE_GOOGLE_CLIENT_ID,
} as const;
