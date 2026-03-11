/**
 * Drizzle Kit 配置
 *
 * 此檔案配置 Drizzle migrations 和代碼生成
 */

import type { Config } from 'drizzle-kit'

const config: Config = {
  schema: './src/adapters/Drizzle/schema.ts',
  out: './drizzle',
  driver: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:local.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
}

export default config
