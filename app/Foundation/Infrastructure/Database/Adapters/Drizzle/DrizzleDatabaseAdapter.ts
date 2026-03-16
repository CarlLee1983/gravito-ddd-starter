/**
 * @file DrizzleDatabaseAdapter.ts
 * @description Drizzle 資料庫適配器實作
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：提供 IDatabaseAccess 介面的 Drizzle ORM 實作。
 * - 職責：將 Drizzle 特定的操作適配為全域統一的資料庫存取介面，隱藏持久化技術細節。
 *
 * @internal 此實現是基礎設施層細節
 */

import type { IDatabaseAccess, IQueryBuilder } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import { getDrizzleInstance } from './config'
import { DrizzleQueryBuilder } from './DrizzleQueryBuilder'
import * as schema from './schema'
import { sql, type SQL } from 'drizzle-orm'

/**
 * 將 (sqlText, params) 轉成 Drizzle 參數化 SQL（? 佔位符）
 */
function toParameterizedSql(sqlText: string, params: unknown[]): SQL {
  if (params.length === 0) {
    return sql.raw(sqlText)
  }
  const parts = sqlText.split('?')
  const chunks: SQL[] = []
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length > 0) chunks.push(sql.raw(parts[i]))
    if (i < params.length) chunks.push(sql`${params[i]}`)
  }
  return sql.fromList(chunks)
}

/**
 * 將 execute 結果正規化為 Record<string, unknown>[]
 */
function toRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[]
  const rows = (result as { rows?: unknown[] })?.rows
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : []
}

/**
 * Drizzle DatabaseAccess 實作類別
 *
 * 提供符合領域需求的資料庫存取介面，支援跨 ORM 的抽換。
 */
class DrizzleDatabaseAccess implements IDatabaseAccess {
  /**
	 * 取得指定資料表的查詢建構器實例
	 *
	 * @param name - 資料表名稱 (須對應 schema 定義中的鍵名)
	 * @returns 回傳一個 Drizzle 特化的 QueryBuilder 實例
	 * @throws 當指定的表名在 schema 中不存在時拋出錯誤
	 *
	 * @example
	 * const users = await db.table('users').select()
	 */
  table(name: string): IQueryBuilder {
    const db = getDrizzleInstance()
    const tableSchema = (schema as any)[name]

    if (!tableSchema) {
      throw new Error(`Table "${name}" not found in schema. Available tables: ${Object.keys(schema).join(', ')}`)
    }

    return new DrizzleQueryBuilder(db, name, tableSchema)
  }

  /**
   * 在資料庫事務中執行 callback
   * 成功自動提交；拋出異常自動回滾。
   *
   * @template T
   * @param callback - 事務內執行的回調函數
   * @returns 回調函數的返回值
   */
  async transaction<T>(callback: (trx: IDatabaseAccess) => Promise<T>): Promise<T> {
    const db = getDrizzleInstance()

    // Drizzle 的 transaction 方法
    return db.transaction(async (tx: any) => {
      // 建立事務隔離的 IDatabaseAccess 實例
      const trxAccess: IDatabaseAccess = {
        table: (name: string) => {
          const tableSchema = (schema as any)[name]
          if (!tableSchema) {
            throw new Error(`Table "${name}" not found in schema`)
          }
          return new DrizzleQueryBuilder(tx, name, tableSchema)
        },
        transaction: async (callback) => {
          // 巢狀事務：直接使用外層事務
          return callback(trxAccess)
        },
        raw: async (sqlText: string, params?: unknown[]) => {
          const stmt = toParameterizedSql(sqlText, params || [])
          const result = await (tx as unknown as { execute: (s: SQL) => Promise<unknown> }).execute(stmt)
          return toRows(result)
        },
      }

      return callback(trxAccess)
    })
  }

  /**
   * 執行原始 SQL 查詢
   *
   * @param sqlText - SQL 查詢語句
   * @param params - 查詢參數（可選）
   * @returns 查詢結果陣列
   */
  async raw(sqlText: string, params?: unknown[]): Promise<Record<string, unknown>[]> {
    const db = getDrizzleInstance()

    try {
      const stmt = toParameterizedSql(sqlText, params || [])
      const result = await (db as unknown as { execute: (s: SQL) => Promise<unknown> }).execute(stmt)
      return toRows(result)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      err.message = `Drizzle raw query failed: ${err.message}`
      throw err
    }
  }
}

/**
 * 建立 Drizzle DatabaseAccess 適配器的工廠函數
 *
 * 用於在接線層中注入符合 IDatabaseAccess 契約的持久化實作。
 *
 * @returns 實作 IDatabaseAccess 介面的實例
 *
 * @example
 * const db = createDrizzleDatabaseAccess()
 */
export function createDrizzleDatabaseAccess(): IDatabaseAccess {
  return new DrizzleDatabaseAccess()
}
