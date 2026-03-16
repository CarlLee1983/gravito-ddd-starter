/**
 * @file MemoryQueryCache.ts
 * @description 記憶體查詢快取實現
 *
 * 用於測試和開發環境的簡單實現。
 * 使用 Map 儲存快取項目，支援 TTL 和 LRU 策略。
 *
 * **特性**：
 * - O(1) 查詢和存儲性能
 * - TTL 自動過期
 * - 統計快取命中率
 * - 模式匹配失效
 *
 * **限制**：
 * - 應用重啟後快取丟失
 * - 不適合分散式環境
 * - 生產環境應使用 Redis 版本
 *
 * @public
 */

import type { IQueryCache, CacheEntry, CacheStats, CacheOptions } from '../../Ports/Services/IQueryCache'

export class MemoryQueryCache implements IQueryCache {
  private readonly cache: Map<string, CacheEntry<any>> = new Map()
  private hits: number = 0
  private misses: number = 0
  private readonly options: Required<CacheOptions>
  private cleanupTimer?: NodeJS.Timeout

  constructor(options: CacheOptions = {}) {
    this.options = {
      defaultTtl: options.defaultTtl ?? 3600000, // 1 hour
      maxSize: options.maxSize ?? 1000,
      validateOnGet: options.validateOnGet ?? false,
      cleanupInterval: options.cleanupInterval ?? 300000, // 5 minutes
      keyPrefix: options.keyPrefix ?? 'query:',
    }

    // 啟動定期清理過期項目
    this.startCleanup()
  }

  /**
   * 啟動定期清理過期項目
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired()
    }, this.options.cleanupInterval)

    // 防止 Node.js 因此計時器保活
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref()
    }
  }

  /**
   * 清理所有過期的快取項目
   */
  private cleanupExpired(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt > 0 && entry.expiresAt <= now) {
        this.cache.delete(key)
        cleaned++
      }
    }
  }

  /**
   * 規範化快取鍵
   */
  private normalizeKey(key: string): string {
    return this.options.keyPrefix + key
  }

  /**
   * 取得快取的查詢結果
   */
  async get<T>(key: string): Promise<T | null> {
    const normalizedKey = this.normalizeKey(key)
    const entry = this.cache.get(normalizedKey)

    if (!entry) {
      this.misses++
      return null
    }

    // 檢查是否過期
    if (entry.expiresAt > 0 && entry.expiresAt <= Date.now()) {
      this.cache.delete(normalizedKey)
      this.misses++
      return null
    }

    // 檢查有效性
    if (!entry.isValid) {
      this.misses++
      return null
    }

    // 更新計數
    this.hits++
    const updated: CacheEntry<T> = {
      ...entry,
      hitCount: entry.hitCount + 1,
    }
    this.cache.set(normalizedKey, updated)

    return entry.data as T
  }

  /**
   * 存儲查詢結果到快取
   */
  async set<T>(key: string, data: T, ttlMs?: number): Promise<void> {
    const normalizedKey = this.normalizeKey(key)
    const now = Date.now()
    const ttl = ttlMs ?? this.options.defaultTtl
    const expiresAt = ttl > 0 ? now + ttl : 0

    // 檢查大小限制
    if (this.cache.size >= this.options.maxSize && !this.cache.has(normalizedKey)) {
      // 移除最少使用的項目 (LRU)
      this.evictLRU()
    }

    const entry: CacheEntry<T> = {
      data,
      createdAt: now,
      expiresAt,
      hitCount: 0,
      isValid: true,
    }

    this.cache.set(normalizedKey, entry)
  }

  /**
   * 移除最少使用的快取項目 (LRU)
   */
  private evictLRU(): void {
    let lruKey: string | null = null
    let lruHitCount = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hitCount < lruHitCount) {
        lruHitCount = entry.hitCount
        lruKey = key
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey)
    }
  }

  /**
   * 檢查快取是否存在且有效
   */
  async has(key: string): Promise<boolean> {
    const normalizedKey = this.normalizeKey(key)
    const entry = this.cache.get(normalizedKey)

    if (!entry) {
      return false
    }

    // 檢查是否過期
    if (entry.expiresAt > 0 && entry.expiresAt <= Date.now()) {
      this.cache.delete(normalizedKey)
      return false
    }

    return entry.isValid
  }

  /**
   * 刪除特定快取
   */
  async delete(key: string): Promise<boolean> {
    const normalizedKey = this.normalizeKey(key)
    return this.cache.delete(normalizedKey)
  }

  /**
   * 刪除匹配模式的所有快取
   */
  async deletePattern(pattern: string): Promise<number> {
    const regex = this.patternToRegex(pattern)
    let deleted = 0
    const keysToDelete: string[] = []

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key)
      deleted++
    }

    return deleted
  }

  /**
   * 將快取模式轉換為正規表達式
   * 支援 * 作為通配符
   */
  private patternToRegex(pattern: string): RegExp {
    // 先移除 keyPrefix 匹配，只對實際的 key 部分進行匹配
    const keyPattern = pattern.includes(this.options.keyPrefix)
      ? pattern.substring(this.options.keyPrefix.length)
      : pattern

    const escaped = keyPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    const regexStr = '^' + this.options.keyPrefix + escaped.replace(/\*/g, '.*') + '$'
    return new RegExp(regexStr)
  }

  /**
   * 清空所有快取
   */
  async clear(): Promise<void> {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }

  /**
   * 取得快取統計資訊
   */
  async getStats(): Promise<CacheStats> {
    let oldestAge: number | undefined
    let newestAge: number | undefined
    const now = Date.now()

    if (this.cache.size > 0) {
      let oldestTime = Infinity
      let newestTime = -Infinity

      for (const entry of this.cache.values()) {
        if (entry.createdAt < oldestTime) {
          oldestTime = entry.createdAt
        }
        if (entry.createdAt > newestTime) {
          newestTime = entry.createdAt
        }
      }

      if (oldestTime !== Infinity) {
        oldestAge = now - oldestTime
      }
      if (newestTime !== -Infinity) {
        newestAge = now - newestTime
      }
    }

    const total = this.hits + this.misses
    const hitRate = total > 0 ? this.hits / total : 0

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      oldestAge,
      newestAge,
    }
  }

  /**
   * 標記快取無效
   */
  async invalidate(pattern: string): Promise<void> {
    const regex = this.patternToRegex(pattern)

    for (const entry of this.cache.values()) {
      if (regex.test(entry.data)) {
        entry.isValid = false
      }
    }
  }

  /**
   * 清理資源
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
  }
}
