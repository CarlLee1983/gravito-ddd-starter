/**
 * Drizzle Kit 配置（本地開發用）
 *
 * 注意：drizzle-kit 0.31.9 主要針對 Cloudflare D1，
 * 項目實際使用 LibSQL/Turso 驅動在 Drizzle config.ts 中
 */

import type { Config } from 'drizzle-kit'

// @ts-ignore - drizzle-kit 0.31.9 只支持 d1-http，但項目使用 libsql
const config = {
  schema: './app/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts',
  out: './drizzle',
  driver: 'better-sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || './database/database.sqlite',
  },
} as Config

export default config
