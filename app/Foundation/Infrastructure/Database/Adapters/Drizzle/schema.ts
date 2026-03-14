/**
 * @file schema.ts
 * @description Drizzle ORM 資料結構 (Schema) 定義
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：定義實體在資料庫中的實體儲存結構。
 * - 職責：使用 Drizzle 的 Schema Builder 定義資料表、欄位型別、關聯性及約束條件。
 *
 * @see https://orm.drizzle.team/docs/sql-schema-declaration
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

/**
 * Users 資料表
 * 儲存系統中的所有使用者帳號資訊。
 */
export const users = sqliteTable('users', {
  /** 主鍵 ID */
  id: text('id').primaryKey(),
  /** 使用者名稱 */
  name: text('name').notNull(),
  /** 電子郵件 (唯一值) */
  email: text('email').notNull().unique(),
  /** 樂觀鎖版本號 (用於併發控制) */
  version: integer('version').notNull().default(0),
  /** 建立時間 */
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  /** 更新時間 */
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

/**
 * Posts 資料表
 * 儲存使用者發佈的文章內容。
 */
export const posts = sqliteTable('posts', {
  /** 主鍵 ID */
  id: text('id').primaryKey(),
  /** 文章標題 */
  title: text('title').notNull(),
  /** 文章內容 */
  content: text('content'),
  /** 作者 ID (關聯到 users.id) */
  author_id: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** 是否已發佈 (0=草稿, 1=已發佈) */
  is_published: integer('is_published').default(0),
  /** 是否已存檔 (0=正常, 1=已存檔) */
  is_archived: integer('is_archived').default(0),
  /** 樂觀鎖版本號 (用於併發控制) */
  version: integer('version').notNull().default(0),
  /** 建立時間 */
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  /** 更新時間 */
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

/**
 * Health Checks 資料表
 * 儲存系統健康檢查的歷史記錄。
 */
export const healthChecks = sqliteTable('health_checks', {
  /** 主鍵 ID */
  id: text('id').primaryKey(),
  /** 狀態碼 (healthy, degraded, unhealthy) */
  status: text('status').notNull(),
  /** 檢查時間戳記 */
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
  /** 詳細資訊 (JSON 字串) */
  details: text('details'),
})

/**
 * Event Store 資料表
 * 儲存所有 Domain Events，用於事件溯源和稽核。
 */
export const eventStore = sqliteTable('event_store', {
  /** 內部主鍵 (UUID) */
  id: text('id').primaryKey(),
  /** 事件 ID (DomainEvent.eventId) */
  event_id: text('event_id').notNull().unique(),
  /** 聚合根 ID */
  aggregate_id: text('aggregate_id').notNull(),
  /** 聚合根類型 ('User' | 'Post' | ...) */
  aggregate_type: text('aggregate_type').notNull(),
  /** 事件類型名稱 */
  event_type: text('event_type').notNull(),
  /** 事件資料 (JSON 序列化) */
  event_data: text('event_data').notNull(),
  /** 事件 Schema 版本 */
  event_version: integer('event_version').notNull().default(1),
  /** 聚合根事件序號 (遞增) */
  aggregate_version: integer('aggregate_version').notNull(),
  /** 事件發生時間 (ISO 8601) */
  occurred_at: text('occurred_at').notNull(),
})
