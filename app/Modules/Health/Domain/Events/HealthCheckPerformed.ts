/**
 * @file HealthCheckPerformed.ts
 * @description 系統健康檢查已執行領域事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import { HealthStatus } from '../ValueObjects/HealthStatus'
import type { SystemChecks } from '../ValueObjects/SystemChecks'

/**
 * 健康檢查已執行事件
 * 當系統完成一次健康檢查後觸發
 */
export class HealthCheckPerformed extends DomainEvent {
  /**
   * @param aggregateId - 聚合 ID
   * @param status - 健康狀態值物件
   * @param checks - 系統檢查結果值物件
   * @param performedAt - 執行時間
   */
  constructor(
    aggregateId: string,
    readonly status: HealthStatus,
    readonly checks: SystemChecks,
    readonly performedAt: Date
  ) {
    super(aggregateId, 'HealthCheckPerformed', {
      status: status.value,
      database: checks.getCheckResult('database'),
      redis: checks.getCheckResult('redis'),
      cache: checks.getCheckResult('cache'),
      performedAt: performedAt.toISOString(),
    })
  }

  /**
   * 序列化為 JSON 對象
   *
   * @returns 序列化後的物件
   */
  toJSON() {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      version: this.version,
      data: this.data,
    }
  }
}
