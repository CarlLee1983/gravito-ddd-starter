/**
 * RabbitMQ 事件分發器
 * 基於 AMQP topic exchange 的領域事件分發系統
 */

import type { DomainEvent } from '../../Domain/DomainEvent'
import type { IntegrationEvent } from '../../Domain/IntegrationEvent'
import type { IEventDispatcher, EventHandler, Event } from '../IEventDispatcher'
import type { IRabbitMQService } from '../IRabbitMQService'

// Simple logger implementation
const logger = {
  info: (msg: string) => console.log(`[RabbitMQEventDispatcher] ${msg}`),
  warn: (msg: string) => console.warn(`[RabbitMQEventDispatcher] ⚠️  ${msg}`),
  error: (msg: string, err?: any) => console.error(`[RabbitMQEventDispatcher] ❌ ${msg}`, err),
  debug: (msg: string) => console.debug(`[RabbitMQEventDispatcher] ${msg}`),
}

export class RabbitMQEventDispatcher implements IEventDispatcher {
  private handlers: Map<string, EventHandler[]> = new Map()
  private pendingBindings: Array<{ eventName: string }> = []
  private isConsuming = false

  constructor(private readonly rabbitmq: IRabbitMQService) {}

  /**
   * 分發事件到 gravito.domain.events exchange
   */
  async dispatch(events: Event | Event[]): Promise<void> {
    const eventList = Array.isArray(events) ? events : [events]

    for (const event of eventList) {
      const eventName = this.getEventName(event)
      const serialized = this.serializeEvent(event)
      const routingKey = this.getRoutingKey(event)

      try {
        await this.rabbitmq.publish('gravito.domain.events', routingKey, {
          name: eventName,
          event: serialized,
          timestamp: new Date().toISOString(),
        })
        logger.debug(`Event published: ${eventName} (routing key: ${routingKey})`)
      } catch (error) {
        logger.error(`Failed to publish event ${eventName}:`, error)
        throw error
      }
    }
  }

  /**
   * 訂閱事件：維護本地處理程序，記錄待綁定的事件
   */
  subscribe(eventName: string, handler: EventHandler): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, [])
    }
    this.handlers.get(eventName)!.push(handler)

    // 記錄待綁定的事件（供 startConsuming 使用）
    if (!this.pendingBindings.some((b) => b.eventName === eventName)) {
      this.pendingBindings.push({ eventName })
    }
  }

  /**
   * 執行處理程序 (供 Consumer 調用)
   */
  async executeHandlers(eventName: string, eventData: any): Promise<void> {
    const handlers = this.handlers.get(eventName) || []

    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(eventData)
        } catch (error) {
          logger.error(`Failed to execute handler for ${eventName}:`, error)
        }
      })
    )
  }

  /**
   * 啟動 AMQP Consumer
   * 為每個訂閱的事件宣告隊列、綁定到 exchange，並開始消費
   */
  async startConsuming(): Promise<void> {
    if (this.isConsuming) {
      logger.warn('Consumer already started')
      return
    }

    if (!this.rabbitmq.isConnected()) {
      throw new Error('RabbitMQ not connected')
    }

    try {
      for (const binding of this.pendingBindings) {
        const queueName = `gravito.events.${binding.eventName}`

        // 1. 宣告隊列（帶 DLX）
        await this.rabbitmq.declareQueue(queueName, {
          durable: true,
          deadLetterExchange: 'gravito.dead.letters',
        })

        // 2. 綁定隊列到 exchange
        // routing key pattern: *.{eventName} 可以捕獲任何來源的該事件
        const routingKeyPattern = `*.${binding.eventName}`
        await this.rabbitmq.bindQueue(queueName, 'gravito.domain.events', routingKeyPattern)

        // 3. 開始消費
        await this.rabbitmq.consume(queueName, async (message, ack, nack) => {
          try {
            const eventName = binding.eventName
            const eventData = message.event || message

            await this.executeHandlers(eventName, eventData)
            ack()
          } catch (error) {
            logger.error(`Error processing message from ${queueName}:`, error)
            nack(true) // 重新加入隊列
          }
        })

        logger.info(`Consumer started for event: ${binding.eventName} (queue: ${queueName})`)
      }

      this.isConsuming = true
      logger.info('RabbitMQ event consumers started')
    } catch (error) {
      logger.error('Failed to start consuming:', error)
      throw error
    }
  }

  /**
   * 提取事件名稱
   */
  private getEventName(event: Event): string {
    // IntegrationEvent 獨有 sourceContext 屬性
    if ('sourceContext' in event && typeof event.sourceContext === 'string') {
      return (event as IntegrationEvent).eventType
    }
    // DomainEvent
    return (event as DomainEvent).constructor.name
  }

  /**
   * 取得路由金鑰（聚合根類型 + 事件名稱）
   */
  private getRoutingKey(event: Event): string {
    const eventName = this.getEventName(event)

    // IntegrationEvent 獨有 sourceContext 屬性
    if ('sourceContext' in event && typeof event.sourceContext === 'string') {
      const integrationEvent = event as IntegrationEvent
      return `${integrationEvent.aggregateType}.${eventName}`
    }

    // DomainEvent - 嘗試從事件物件取得 aggregateType
    const domainEvent = event as DomainEvent
    const aggregateType = (domainEvent as any).aggregateType || 'Unknown'
    return `${aggregateType}.${eventName}`
  }

  /**
   * 序列化事件
   */
  private serializeEvent(event: Event): Record<string, any> {
    // IntegrationEvent 獨有 sourceContext 屬性
    if ('sourceContext' in event && typeof event.sourceContext === 'string') {
      // IntegrationEvent 已是 plain object，直接回傳
      return event as Record<string, any>
    }
    // DomainEvent
    return (event as DomainEvent).toJSON()
  }
}
