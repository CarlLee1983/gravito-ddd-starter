/**
 * @file DrizzleConnectivityCheck.ts
 * @description Drizzle 資料庫連線檢查實作
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：實作 IDatabaseConnectivityCheck 介面。
 * - 職責：提供一個輕量化的機制來驗證 Drizzle 與底層資料庫的連線狀態，通常用於系統健康檢查 (Health Check)。
 *
 * @internal 此實現是基礎設施層細節
 */

import type { IDatabaseConnectivityCheck } from '@/Shared/Infrastructure/Ports/Database/IDatabaseConnectivityCheck'
import type { ILogger } from '@/Shared/Infrastructure/Ports/Services/ILogger'
import { getDrizzleInstance } from './config'

/**
 * 建立 Drizzle 連線檢查實例的工廠函數
 *
 * 此實例可用於驗證資料庫連線是否正常。
 *
 * @returns 實作 IDatabaseConnectivityCheck 介面的物件
 *
 * @example
 * const check = createDrizzleConnectivityCheck()
 * const isConnected = await check.ping()
 */
export function createDrizzleConnectivityCheck(): IDatabaseConnectivityCheck {
  const logger: ILogger = {
    info: (msg: string) => console.info(`[DrizzleConnectivityCheck] ${msg}`),
    warn: (msg: string) => console.warn(`[DrizzleConnectivityCheck] ${msg}`),
    error: (msg: string, err?: any) => console.error(`[DrizzleConnectivityCheck] ${msg}`, err),
    debug: (msg: string) => console.debug(`[DrizzleConnectivityCheck] ${msg}`),
  }

  return {
    /**
     * 執行簡單查詢以驗證連線
     * @returns 是否連線成功
     */
    async ping(): Promise<boolean> {
      try {
        const db = getDrizzleInstance()

        // 執行簡單的 SELECT 1 查詢來驗證連線
        await (db as any).execute?.('SELECT 1') || (db as any).run?.('SELECT 1')

        return true
      } catch (error) {
        logger.error('Database connectivity check failed', error)
        return false
      }
    },
  }
}
