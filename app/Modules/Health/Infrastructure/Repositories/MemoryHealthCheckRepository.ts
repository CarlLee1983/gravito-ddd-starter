/**
 * @file MemoryHealthCheckRepository.ts
 * @description 實現內存形式的健康檢查倉儲，主要用於開發與測試環境
 * @module app/Modules/Health/Infrastructure/Repositories
 *
 * Phase 1 改造：
 * - 使用 reconstitute() 而非 fromDatabase()
 * - 使用 performedAt 而非 timestamp
 * - 使用 SystemChecks ValueObject 而非 plain object
 */

import { HealthCheck } from '../../Domain/Aggregates/HealthCheck'
import { HealthStatus } from '../../Domain/ValueObjects/HealthStatus'
import { SystemChecks } from '../../Domain/ValueObjects/SystemChecks'
import type { IHealthCheckRepository } from '../../Domain/Repositories/IHealthCheckRepository'

/**
 * MemoryHealthCheckRepository 類別
 *
 * 在 DDD 架構中屬於「基礎設施層 (Infrastructure Layer)」，實現了 IHealthCheckRepository 介面。
 * 該實現將資料儲存在內存 (Map) 中，不具備持久化到硬碟的能力。
 *
 * Repository 職責：
 * - toDomain(): 將持久化資料轉換為 Domain Object
 * - toRow(): 將 Domain Object 轉換為可儲存的資料
 * - 管理領域事件分派（save 後提交事件）
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
   * 獲取最後一次執行的記錄
   *
   * @returns Promise 包含最新的健康檢查聚合根
   */
  async findLatest(): Promise<HealthCheck | null> {
    let latest: HealthCheck | null = null
    let latestTime = 0

    for (const check of this.checks.values()) {
      const time = check.performedAt.getTime()
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
   * @param params - 分頁參數
   * @returns Promise 包含聚合根陣列
   */
  async findAll(params?: { limit?: number; offset?: number }): Promise<HealthCheck[]> {
    const checks = Array.from(this.checks.values())
    // 按執行時間降序排序，返回最新的記錄
    const sorted = checks.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
    const offset = params?.offset ?? 0
    const limit = params?.limit ?? 10
    return sorted.slice(offset, offset + limit)
  }

  /**
   * 保存健康檢查記錄
   *
   * 若超過最大筆數限制，則會刪除最舊的記錄以釋放空間。
   *
   * **Repository 責任**：
   * 1. 在儲存時，標記聚合的事件為已提交（因為內存不需持久化層）
   * 2. 若有 EventDispatcher，應分派未提交的事件
   *
   * @param check - 健康檢查聚合根（包含未提交事件）
   * @returns Promise<void>
   */
  async save(check: HealthCheck): Promise<void> {
    // 儲存聚合
    this.checks.set(check.id, check)

    // TODO: 分派未提交的事件
    // const events = check.getUncommittedEvents()
    // for (const event of events) {
    //   await this.eventDispatcher.dispatch(event)
    // }

    // 標記事件為已提交
    check.markEventsAsCommitted()

    // 清理舊記錄 (保持最多 maxRecords 條)
    if (this.checks.size > this.maxRecords) {
      const sorted = Array.from(this.checks.values())
        .sort((a, b) => a.performedAt.getTime() - b.performedAt.getTime())

      // 刪除最舊的記錄
      const toDelete = sorted.slice(0, this.checks.size - this.maxRecords)
      for (const record of toDelete) {
        this.checks.delete(record.id)
      }
    }
  }

  /**
   * 根據 ID 刪除記錄
   *
   * @param id - 記錄唯一識別符
   * @returns Promise<void>
   */
  async delete(id: string): Promise<void> {
    this.checks.delete(id)
  }

  /**
   * 計算符合條件的實體總數
   *
   * @returns Promise 包含記錄總筆數
   */
  async count(): Promise<number> {
    return this.checks.size
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
      if (check.performedAt.getTime() < cutoffTime) {
        this.checks.delete(id)
        deleted++
      }
    }

    return deleted
  }

  /**
   * 將資料庫行轉換為 Domain Object
   *
   * @param row - 儲存的資料行
   * @returns HealthCheck 聚合根
   * @private
   */
  private toDomain(row: any): HealthCheck {
    const systemChecks = SystemChecks.create(
      row.database,
      row.redis ?? true,
      row.cache ?? true
    )
    return HealthCheck.reconstitute(
      row.id,
      new HealthStatus(row.status),
      systemChecks,
      new Date(row.performedAt),
      row.message
    )
  }

  /**
   * 將 Domain Object 轉換為可儲存的資料
   *
   * @param hc - HealthCheck 聚合根
   * @returns 儲存的資料行
   * @private
   */
  private toRow(hc: HealthCheck): any {
    return {
      id: hc.id,
      status: hc.status.value,
      database: hc.checks.database,
      redis: hc.checks.redis,
      cache: hc.checks.cache,
      performedAt: hc.performedAt,
      message: hc.message,
    }
  }
}
