/**
 * @file MemoryHealthCheckRepository.ts
 * @description 實現內存形式的健康檢查倉儲，主要用於開發與測試環境
 * @module src/Modules/Health/Infrastructure/Repositories
 */

import { HealthCheck } from '../../Domain/Aggregates/HealthCheck'
import type { IHealthCheckRepository } from '../../Domain/Repositories/IHealthCheckRepository'

/**
 * MemoryHealthCheckRepository 類別
 * 
 * 在 DDD 架構中屬於「基礎設施層 (Infrastructure Layer)」，實現了 IHealthCheckRepository 介面。
 * 該實現將資料儲存在內存 (Map) 中，不具備持久化到硬碟的能力。
 */
export class MemoryHealthCheckRepository implements IHealthCheckRepository {
  /** 儲存記錄的內存 Map */
  private checks: Map<string, HealthCheck> = new Map()
  /** 最大保留記錄筆數 */
  private readonly maxRecords = 100

  /**
   * 根據 ID 尋找記錄
   * 
   * @param id - 記錄唯一識別符
   * @returns Promise 包含聚合根或 null
   */
  async findById(id: string): Promise<HealthCheck | null> {
    return this.checks.get(id) || null
  }

  /**
   * 獲取最後一次更新的記錄
   * 
   * @returns Promise 包含最新的健康檢查聚合根
   */
  async findLatest(): Promise<HealthCheck | null> {
    let latest: HealthCheck | null = null
    let latestTime = 0

    for (const check of this.checks.values()) {
      const time = check.timestamp.getTime()
      if (time > latestTime) {
        latestTime = time
        latest = check
      }
    }

    return latest
  }

  /**
   * 獲取所有記錄並按時間倒序排列
   * 
   * @param limit - 限制返回筆數
   * @returns Promise 包含聚合根陣列
   */
  async findAll(limit: number = 10): Promise<HealthCheck[]> {
    const checks = Array.from(this.checks.values())
    // 按時間戳降序排序，返回最新的記錄
    return checks
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * 保存健康檢查記錄
   * 
   * 若超過最大筆數限制，則會刪除最舊的記錄以釋放空間。
   * 
   * @param check - 健康檢查聚合根
   * @returns Promise<void>
   */
  async save(check: HealthCheck): Promise<void> {
    this.checks.set(check.id, check)

    // 清理舊記錄 (保持最多 maxRecords 條)
    if (this.checks.size > this.maxRecords) {
      const sorted = Array.from(this.checks.values())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

      // 刪除最舊的記錄
      const toDelete = sorted.slice(0, this.checks.size - this.maxRecords)
      for (const record of toDelete) {
        this.checks.delete(record.id)
      }
    }
  }

  /**
   * 刪除指定天數之前的舊記錄
   * 
   * @param days - 天數限制
   * @returns Promise 包含被刪除的筆數
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000
    let deleted = 0

    for (const [id, check] of this.checks.entries()) {
      if (check.timestamp.getTime() < cutoffTime) {
        this.checks.delete(id)
        deleted++
      }
    }

    return deleted
  }
}
