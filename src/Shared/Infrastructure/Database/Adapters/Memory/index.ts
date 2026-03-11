/**
 * @file index.ts
 * @description Memory ORM 適配器進入點
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：提供內存持久化方案的公開介面。
 * - 職責：匯出內存版資料庫存取實作與工廠函數，供接線層在 memory 模式下使用。
 *
 * @public - 匯出公開的工廠函數
 * @internal - 實現細節對外隱藏
 */

import { MemoryDatabaseAccess } from './MemoryDatabaseAccess'

export { MemoryDatabaseAccess } from './MemoryDatabaseAccess'

/**
 * 建立 Memory DatabaseAccess 實例
 *
 * 此工廠函數是建立 Memory 適配器的標準方式。
 * @returns 回傳一個全新的 MemoryDatabaseAccess 實例
 */
export function createMemoryDatabaseAccess() {
  return new MemoryDatabaseAccess()
}
