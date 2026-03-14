/**
 * @file HealthCheck.ts
 * @description 定義系統健康檢查的聚合根 (Aggregate Root)
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
 */
export class HealthCheck extends AggregateRoot {
  private _status!: HealthStatus
  private _checks!: SystemChecks
  private _performedAt!: Date
  private _message?: string

  /**
   * @param id - 唯一識別符
   */
  private constructor(id: string) {
    super(id)
  }

  /**
   * 靜態工廠方法：執行新的健康檢查
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

  /** 獲取健康狀態 */
  get status(): HealthStatus {
    return this._status
  }

  /** 獲取系統檢查結果 */
  get checks(): SystemChecks {
    return this._checks
  }

  /** 獲取執行時間 */
  get performedAt(): Date {
    return this._performedAt
  }

  /** 獲取狀態訊息 */
  get message(): string | undefined {
    return this._message
  }

  /**
   * 獲取檢查詳情（Map 格式）
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
