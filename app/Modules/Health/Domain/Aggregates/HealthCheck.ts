/**
 * @file HealthCheck.ts
 * @description 定義系統健康檢查的聚合根 (Aggregate Root)
 * @module app/Modules/Health/Domain/Aggregates
 *
 * DDD 改造：
 * - 繼承 AggregateRoot 而非 BaseEntity
 * - 所有狀態變更通過領域事件驅動
 * - 移除 fromDatabase/toDatabaseRow（Repository 負責）
 * - 提供 reconstitute 用於持久化層還原
 */

import { AggregateRoot } from '@/Foundation/Domain/AggregateRoot'
import type { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import { HealthStatus } from '../ValueObjects/HealthStatus'
import type { SystemChecks } from '../ValueObjects/SystemChecks'
import { HealthCheckPerformed } from '../Events/HealthCheckPerformed'

/**
 * HealthCheck 聚合根
 *
 * 代表系統在特定時間點的健康狀況快照。
 * 所有狀態變更都通過領域事件進行，為 Event Sourcing 預留支援。
 */
export class HealthCheck extends AggregateRoot {
  private _status!: HealthStatus
  private _checks!: SystemChecks
  private _performedAt!: Date
  private _message?: string

  private constructor(id: string) {
    super(id)
  }

  /**
   * 靜態工廠方法：執行新的健康檢查
   *
   * 建立新的 HealthCheck 聚合，並產生 HealthCheckPerformed 事件。
   * 事件會立即套用到狀態，同時追蹤為「未提交」。
   *
   * @param id - 唯一識別符
   * @param checks - 系統檢查結果
   * @returns 新的 HealthCheck 聚合根
   */
  static perform(id: string, checks: SystemChecks): HealthCheck {
    const hc = new HealthCheck(id)
    const status = checks.deriveStatus()
    const performedAt = new Date()

    hc.raiseEvent(new HealthCheckPerformed(id, status, checks, performedAt))
    return hc
  }

  /**
   * 靜態工廠方法：從持久化資料重建聚合
   *
   * 用於 Repository 從資料庫還原已存在的 HealthCheck。
   * 不產生任何事件，只重建狀態。
   *
   * @param id - 聚合 ID
   * @param status - 健康狀態
   * @param checks - 系統檢查結果
   * @param performedAt - 檢查執行時間
   * @param message - 可選的狀態訊息
   * @returns 重建的 HealthCheck 聚合根
   */
  static reconstitute(
    id: string,
    status: HealthStatus,
    checks: SystemChecks,
    performedAt: Date,
    message?: string
  ): HealthCheck {
    const hc = new HealthCheck(id)
    hc._status = status
    hc._checks = checks
    hc._performedAt = performedAt
    hc._message = message
    return hc
  }

  /**
   * 應用事件到聚合狀態
   *
   * AggregateRoot 抽象方法實現。
   * 定義如何將領域事件轉換為狀態變化。
   *
   * @param event - 要套用的領域事件
   */
  applyEvent(event: DomainEvent): void {
    if (event instanceof HealthCheckPerformed) {
      this._status = event.status
      this._checks = event.checks
      this._performedAt = event.performedAt
      this._message = event.status.isFullyHealthy()
        ? 'All systems operational'
        : 'Some services degraded'
    }
  }

  // === 唯讀存取器 ===
  // 不提供 setter，所有狀態變更必須通過事件

  get status(): HealthStatus {
    return this._status
  }

  get checks(): SystemChecks {
    return this._checks
  }

  get performedAt(): Date {
    return this._performedAt
  }

  get message(): string | undefined {
    return this._message
  }

  /**
   * 取得檢查詳情（Map 格式）
   *
   * @returns 系統檢查結果的 Map
   */
  get checksDetail() {
    const detail: Record<string, boolean> = {}
    for (const [name, status] of this._checks.checks) {
      detail[name] = status
    }
    return detail
  }
}
