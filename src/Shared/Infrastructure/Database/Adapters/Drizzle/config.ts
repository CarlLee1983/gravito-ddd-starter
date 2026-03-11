/**
 * @file config.ts
 * @description Drizzle ORM 設定與連接管理
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：負責底層 ORM 框架的初始化與連線池管理。
 * - 職責：從環境變數讀取資料庫連線資訊，並確保全系統共用單一 Drizzle 連線實例。
 */

import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

/** 全局 Drizzle 實例單例 */
let db: ReturnType<typeof drizzle> | null = null

/**
 * 初始化 Drizzle 資料庫連接
 *
 * @returns 回傳初始化後的 Drizzle 資料庫實例
 */
export function initializeDrizzle() {
  if (db) {
    return db
  }

  const databaseUrl = process.env.DATABASE_URL || 'file:local.db'

  const client = createClient({
    url: databaseUrl,
  })

  db = drizzle(client, { schema })

  return db
}

/**
 * 獲取 Drizzle 資料庫實例
 * 採用延遲加載模式，確保全系統共用同一個連接實例。
 *
 * @returns 當前的 Drizzle 實例
 */
export function getDrizzleInstance() {
  if (!db) {
    return initializeDrizzle()
  }
  return db
}
