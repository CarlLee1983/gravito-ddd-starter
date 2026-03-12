/**
 * HealthCheckPerformed Domain Event
 *
 * 當系統執行健康檢查並記錄結果時產生的事件
 */

import { DomainEvent } from '@/Shared/Domain/DomainEvent'
import { HealthStatus } from '../ValueObjects/HealthStatus'
import type { SystemChecks } from '../ValueObjects/SystemChecks'

export class HealthCheckPerformed extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly status: HealthStatus,
    readonly checks: SystemChecks,
    readonly performedAt: Date
  ) {
    super(aggregateId, 'HealthCheckPerformed', {
      status: status.value,
      database: checks.database,
      redis: checks.redis,
      cache: checks.cache,
      performedAt: performedAt.toISOString(),
    })
  }

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
