/**
 * RabbitMQ EventStore 裝飾者
 * 在事件持久化後，發佈整合事件給外部系統
 * Decorator pattern: 包裝內部 EventStore（Redis 或 Memory）
 */

import type { IEventStore, StoredEvent } from '../../IEventStore'
import type { IRabbitMQService } from '../../IRabbitMQService'

// Simple logger implementation
const logger = {
  info: (msg: string) => console.log(`[RabbitMQEventStore] ${msg}`),
  warn: (msg: string) => console.warn(`[RabbitMQEventStore] ⚠️  ${msg}`),
  error: (msg: string, err?: any) => console.error(`[RabbitMQEventStore] ❌ ${msg}`, err),
  debug: (msg: string) => console.debug(`[RabbitMQEventStore] ${msg}`),
}

export class RabbitMQEventStore implements IEventStore {
  constructor(
    private readonly inner: IEventStore,
    private readonly rabbitmq: IRabbitMQService
  ) {}

  /**
   * 追加事件：先持久化到內部 Store，再發佈到 RabbitMQ
   */
  async append(events: StoredEvent[]): Promise<void> {
    // 1. 先持久化到內部 EventStore（Redis 或 Memory）
    await this.inner.append(events)

    // 2. 廣播整合事件給外部系統
    if (!this.rabbitmq.isConnected()) {
      logger.warn('RabbitMQ not connected, skipping event publishing')
      return
    }

    try {
      for (const event of events) {
        const routingKey = `${event.aggregateType}.${event.eventType}`
        const integrationEvent = {
          id: event.eventId,
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          eventType: event.eventType,
          eventData: JSON.parse(event.eventData),
          eventVersion: event.eventVersion,
          aggregateVersion: event.aggregateVersion,
          occurredAt: event.occurredAt,
          sourceContext: 'gravito-ddd', // 標記來源系統
        }

        await this.rabbitmq.publish('gravito.integration.events', routingKey, integrationEvent)
        logger.debug(`Integration event published: ${routingKey}`)
      }
    } catch (error) {
      logger.error('Failed to publish integration events:', error)
      // 不拋出錯誤，因為事件已經持久化
    }
  }

  /**
   * 按聚合根 ID 載入事件
   */
  async loadByAggregateId(
    aggregateId: string,
    aggregateType?: string,
    fromVersion?: number
  ): Promise<StoredEvent[]> {
    return this.inner.loadByAggregateId(aggregateId, aggregateType, fromVersion)
  }

  /**
   * 按事件類型載入事件
   */
  async loadByEventType(eventType: string): Promise<StoredEvent[]> {
    return this.inner.loadByEventType(eventType)
  }

  /**
   * 統計聚合根的事件數量
   */
  async countByAggregateId(aggregateId: string): Promise<number> {
    return this.inner.countByAggregateId(aggregateId)
  }
}
