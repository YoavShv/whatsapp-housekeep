import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:./data/dev.db',
  },
} satisfies Config
