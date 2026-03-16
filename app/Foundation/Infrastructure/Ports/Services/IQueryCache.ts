/**
 * @file IQueryCache.ts
 * @description 查詢快取介面 (Port)
 *
 * 查詢結果快取用於提升頻繁查詢的性能：
 * - 避免重複執行相同 SQL
 * - 減少數據庫負載
 * - 加速聚合根和讀側重建
 *
 * **使用場景**：
 * - 統計查詢（數值較少變化）
 * - 參考資料查詢（分類、狀態）
 * - 熱點數據（常被查詢的聚合根）
 * - 複雜 JOIN 查詢（執行時間長）
 *
 * **快取策略**：
 * - TTL-based（時間失效）
 * - Event-based（事件驅動失效）
 * - Manual（手動清除）
 * - LRU（最近最少使用）
 *
 * @public
 */

/**
 * 快取鍵生成器
 * 用於根據查詢條件生成唯一的快取鍵
 *
 * @public
 */
export interface CacheKeyGenerator {
  /**
   * 生成查詢快取鍵
   *
   * @param tableName - 表名
   * @param query - 查詢條件（JSON 化）
   * @returns 快取鍵
   */
  generate(tableName: string, query: Record<string, unknown>): string
}

/**
 * 快取條目元數據
 *
 * @public
 */
export interface CacheEntry<T> {
  /** 快取的查詢結果 */
  readonly data: T
  /** 快取建立時間戳 */
  readonly createdAt: number
  /** 快取過期時間戳（0 表示無期限） */
  readonly expiresAt: number
  /** 快取命中次數 */
  readonly hitCount: number
  /** 是否已驗證（與數據庫同步） */
  readonly isValid: boolean
}

/**
 * 查詢結果快取介面
 *
 * 提供查詢結果的存儲、檢索和失效管理
 *
 * @public
 */
export interface IQueryCache {
  /**
   * 取得快取的查詢結果
   * 檢查快取是否存在、未過期、有效
   *
   * @param key - 快取鍵
   * @returns 快取結果或 null（未找到或已過期）
   */
  get<T>(key: string): Promise<T | null>

  /**
   * 存儲查詢結果到快取
   * 支援設置過期時間和自動失效策略
   *
   * @param key - 快取鍵
   * @param data - 要快取的數據
   * @param ttlMs - 存活時間（毫秒）。0 = 永不過期
   * @throws 存儲失敗時拋出異常
   */
  set<T>(key: string, data: T, ttlMs?: number): Promise<void>

  /**
   * 檢查快取是否存在且有效
   *
   * @param key - 快取鍵
   * @returns 若快取存在且有效返回 true
   */
  has(key: string): Promise<boolean>

  /**
   * 刪除特定快取
   *
   * @param key - 快取鍵
   * @returns 成功刪除返回 true，不存在返回 false
   */
  delete(key: string): Promise<boolean>

  /**
   * 刪除匹配模式的所有快取
   * 常用於失效相關查詢結果
   *
   * @param pattern - 模式（支援 * 通配符）
   * @returns 刪除的快取數量
   */
  deletePattern(pattern: string): Promise<number>

  /**
   * 清空所有快取
   * 用於緊急故障恢復或測試
   *
   * @throws 清除失敗時拋出異常
   */
  clear(): Promise<void>

  /**
   * 取得快取統計資訊
   *
   * @returns 快取統計（大小、命中率等）
   */
  getStats(): Promise<CacheStats>

  /**
   * 標記快取無效
   * 通常在相關數據修改時呼叫
   *
   * @param pattern - 要失效的快取模式
   * @example
   * ```typescript
   * // 用戶數據修改時，失效所有用戶相關快取
   * await cache.invalidate('users:*')
   * ```
   */
  invalidate(pattern: string): Promise<void>
}

/**
 * 快取統計資訊
 *
 * @public
 */
export interface CacheStats {
  /** 快取中的項目總數 */
  readonly size: number

  /** 快取命中次數 */
  readonly hits: number

  /** 快取未命中次數 */
  readonly misses: number

  /** 快取命中率（0-1） */
  readonly hitRate: number

  /** 快取佔用記憶體（字節，若適用） */
  readonly memoryUsage?: number

  /** 最舊快取項目的年齡（毫秒） */
  readonly oldestAge?: number

  /** 最新快取項目的年齡（毫秒） */
  readonly newestAge?: number
}

/**
 * 快取組態選項
 *
 * @public
 */
export interface CacheOptions {
  /** 預設快取時間（毫秒） */
  defaultTtl?: number

  /** 最大快取項目數 */
  maxSize?: number

  /** 是否在快取前驗證數據 */
  validateOnGet?: boolean

  /** 自動清理過期項目的間隔（毫秒） */
  cleanupInterval?: number

  /** 快取鍵前綴（用於隔離不同實例） */
  keyPrefix?: string
}
