/**
 * @file HealthCheckService.ts
 * @description 系統健康檢查領域服務 (Domain Service)
 * @module src/Modules/Health/Domain/Services
 */

/**
 * SystemChecks 介面
 * 
 * 定義系統各元件檢查結果的結構。
 */
export interface SystemChecks {
  /** 資料庫是否連通 */
  database: boolean
  /** Redis 是否連通 (選填) */
  redis?: boolean
  /** 快取服務是否正常 (選填) */
  cache?: boolean
}

/**
 * HealthCheckService 類別
 * 
 * 在 DDD 架構中作為「領域服務 (Domain Service)」。
 * 包含不屬於單一聚合根的業務邏輯：實際執行各個基礎設施元件 (DB, Redis, Cache) 的可用性檢測。
 */
export class HealthCheckService {
  /**
   * 檢查資料庫連線可用性
   * 
   * @param db - 資料庫存取對象
   * @returns Promise 包含是否連通的布林值
   */
  async checkDatabase(db: any): Promise<boolean> {
    try {
      if (!db) return false
      // 嘗試執行簡單查詢驗證連線
      await db.raw('SELECT 1')
      return true
    } catch (error) {
      console.error('Database health check failed:', error)
      return false
    }
  }

  /**
   * 檢查 Redis 服務可用性
   * 
   * @param redis - Redis 客戶端對象
   * @returns Promise 包含是否連通的布林值
   */
  async checkRedis(redis: any): Promise<boolean> {
    try {
      if (!redis) return true // Redis 是選填組件，若未配置視為正常
      await redis.ping()
      return true
    } catch (error) {
      console.error('Redis health check failed:', error)
      return false
    }
  }

  /**
   * 檢查快取服務讀寫功能是否正常
   * 
   * @param cache - 快取服務介面對象
   * @returns Promise 包含功能是否正常的布林值
   */
  async checkCache(cache: any): Promise<boolean> {
    try {
      if (!cache) return true // Cache 是選填組件，若未配置視為正常
      // 嘗試寫入、讀取並刪除測試鍵值
      const testKey = `health-check-${Date.now()}`
      await cache.set(testKey, 'ok', 10) // 10 秒 TTL
      const value = await cache.get(testKey)
      await cache.delete(testKey)
      return value === 'ok'
    } catch (error) {
      console.error('Cache health check failed:', error)
      return false
    }
  }

  /**
   * 執行完整的系統健康檢查
   * 
   * 同時發起所有組件的檢查請求，並彙整結果。
   * 
   * @param db - 資料庫對象
   * @param redis - Redis 對象 (選填)
   * @param cache - 快取對象 (選填)
   * @returns Promise 包含 SystemChecks 結果物件
   */
  async checkSystem(db: any, redis?: any, cache?: any): Promise<SystemChecks> {
    const [dbOk, redisOk, cacheOk] = await Promise.all([
      this.checkDatabase(db),
      this.checkRedis(redis),
      this.checkCache(cache)
    ])

    return {
      database: dbOk,
      redis: redisOk,
      cache: cacheOk
    }
  }
}
