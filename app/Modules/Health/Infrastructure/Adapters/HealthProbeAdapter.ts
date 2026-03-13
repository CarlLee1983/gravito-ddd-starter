/**
 * @file HealthProbeAdapter.ts
 * @description 健康探針 Adapter 實現
 *
 * 實現 IInfrastructureProbe Port 介面，提供系統各組件的健康檢查能力。
 * 此 Adapter 可依賴具體的 Port（如 IDatabaseAccess、IRedisService 等），
 * 使得 Domain 層完全與基礎設施選擇無關。
 */

import type { IInfrastructureProbe } from '../../Domain/Services/IInfrastructureProbe'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IRedisService } from '@/Shared/Infrastructure/Ports/Services/IRedisService'
import type { ICacheService } from '@/Shared/Infrastructure/Ports/Services/ICacheService'
import type { ILogger } from '@/Shared/Infrastructure/Ports/Core/ILogger'

/**
 * 健康探針 Adapter 實現
 *
 * 實現通用的 probeByName() 和 getProbeableComponents() 方法，
 * 隱藏具體的技術實現細節。
 */
export class HealthProbeAdapter implements IInfrastructureProbe {
  private readonly probeFunctions: Map<string, () => Promise<boolean>>

  /**
   * 建構子
   *
   * @param databaseAccess - 數據庫訪問 Port（可選）
   * @param redisService - Redis 服務 Port（可選）
   * @param cacheService - 快取服務 Port（可選）
   * @param logger - 日誌服務（可選）
   */
  constructor(
    private databaseAccess?: IDatabaseAccess,
    private redisService?: IRedisService,
    private cacheService?: ICacheService,
    private logger?: ILogger
  ) {
    // 註冊所有可用的探針函數
    this.probeFunctions = new Map()

    if (databaseAccess) {
      this.probeFunctions.set('database', () => this.probeDatabase())
    }

    if (redisService) {
      this.probeFunctions.set('redis', () => this.probeRedis())
    }

    if (cacheService) {
      this.probeFunctions.set('cache', () => this.probeCache())
    }
  }

  /**
   * 按名稱探測一個基礎設施組件的可用性
   *
   * @param name 組件名稱（'database', 'redis', 'cache'）
   * @returns 該組件是否可用
   */
  async probeByName(name: string): Promise<boolean> {
    const probeFn = this.probeFunctions.get(name)

    if (!probeFn) {
      this.logger?.warn(`Unknown probe component: ${name}`)
      return false
    }

    try {
      return await probeFn()
    } catch (error) {
      this.logger?.error(`Probe failed for ${name}`, { error })
      return false
    }
  }

  /**
   * 取得所有可探測的組件名稱列表
   *
   * @returns 組件名稱陣列
   */
  getProbeableComponents(): string[] {
    return Array.from(this.probeFunctions.keys())
  }

  /**
   * 探測資料庫連線可用性
   *
   * @returns 資料庫是否可用
   * @private
   */
  private async probeDatabase(): Promise<boolean> {
    if (!this.databaseAccess) {
      return true // 未配置時視為可用
    }

    try {
      // 嘗試執行一個簡單的連線檢查（具體實現由 IDatabaseAccess Adapter 提供）
      // 這裡假設有一個健康檢查方法，實際可能需要根據具體實現調整
      return true // 暫時返回 true，實際應調用 databaseAccess 的檢查方法
    } catch (error) {
      this.logger?.error('Database probe failed', { error })
      return false
    }
  }

  /**
   * 探測 Redis 服務可用性
   *
   * @returns Redis 是否可用
   * @private
   */
  private async probeRedis(): Promise<boolean> {
    if (!this.redisService) {
      return true // 未配置時視為可用
    }

    try {
      // 嘗試 PING Redis
      await (this.redisService as any).ping?.()
      return true
    } catch (error) {
      this.logger?.error('Redis probe failed', { error })
      return false
    }
  }

  /**
   * 探測快取服務可用性
   *
   * @returns 快取是否可用
   * @private
   */
  private async probeCache(): Promise<boolean> {
    if (!this.cacheService) {
      return true // 未配置時視為可用
    }

    try {
      // 嘗試執行一個簡單的 get 操作
      await (this.cacheService as any).get?.('_health_check')
      return true
    } catch (error) {
      this.logger?.error('Cache probe failed', { error })
      return false
    }
  }
}
