/**
 * @file RabbitMQEventDispatcher.ts
 * @description 基於 AMQP 的非同步領域事件分發器
 *
 * 特點：
 * - 非同步分發，事件發布到 topic exchange
 * - 支援死信交換 (DLX) 處理失敗消息
 * - 由外部 Consumer 消費消息並執行 Handler
 * - 支援重試機制（指數退避）
 * - 失敗事件記錄到死信隊列和 DLX
 *
 * Role: Infrastructure Adapter
 */

import type { Event, EventHandler } from '../../Ports/Messaging/IEventDispatcher'
import type { IRabbitMQService } from '../../Ports/Messaging/IRabbitMQService'
import type { ILogger } from '../../Ports/Services/ILogger'
import { BaseEventDispatcher } from './BaseEventDispatcher'

/**
 * RabbitMQ 事件分發器
 *
 * 基於 AMQP topic exchange 的領域事件分發系統。
 * 與 Consumer 配合，實現事件的非同步執行和死信隊列管理。
 */
export class RabbitMQEventDispatcher extends BaseEventDispatcher {
	private pendingBindings: Array<{ eventName: string }> = []
	private isConsuming = false
	private defaultLogger: ILogger = {
		info: (msg: string) => console.info(`[RabbitMQEventDispatcher] ${msg}`),
		warn: (msg: string) => console.warn(`[RabbitMQEventDispatcher] ${msg}`),
		error: (msg: string, err?: any) => console.error(`[RabbitMQEventDispatcher] ${msg}`, err),
		debug: (msg: string) => console.debug(`[RabbitMQEventDispatcher] ${msg}`),
	}

	constructor(private readonly rabbitmq: IRabbitMQService) {
		super()
		this.setLogger(this.defaultLogger)
	}

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
        this.logger?.debug(`Event published: ${eventName} (routing key: ${routingKey})`)
      } catch (error) {
        this.logger?.error(`Failed to publish event ${eventName}:`, error)
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
	 *
	 * @param eventName - 事件名稱
	 * @param eventData - 事件數據
	 * @internal 僅供 Consumer 使用，不應直接呼叫
	 *
	 * 使用基類的 executeHandlers（包含失敗重試邏輯）
	 */
	public async executeHandlers(eventName: string, eventData: any): Promise<void> {
		this.logger?.info(`執行 ${eventName} 的所有 Handler`)
		await super.executeHandlers(eventName, eventData)
	}

  /**
   * 啟動 AMQP Consumer
   * 為每個訂閱的事件宣告隊列、綁定到 exchange，並開始消費
   */
  async startConsuming(): Promise<void> {
    if (this.isConsuming) {
      this.logger?.warn('Consumer already started')
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
            this.logger?.error(`Error processing message from ${queueName}:`, error)
            nack(true) // 重新加入隊列
          }
        })

        this.logger?.info(`Consumer started for event: ${binding.eventName} (queue: ${queueName})`)
      }

      this.isConsuming = true
      this.logger?.info('RabbitMQ event consumers started')
    } catch (error) {
      this.logger?.error('Failed to start consuming:', error)
      throw error
    }
  }

	/**
	 * 取得路由金鑰（聚合根類型 + 事件名稱）
	 *
	 * 使用 getEventName() 從基類取得事件名稱（共用邏輯）
	 */
	private getRoutingKey(event: Event): string {
		const eventName = this.getEventName(event)

		// IntegrationEvent 獨有 sourceContext 屬性
		if ('sourceContext' in event && typeof event.sourceContext === 'string') {
			const integrationEvent = event as any
			return `${integrationEvent.aggregateType}.${eventName}`
		}

		// DomainEvent - 嘗試從事件物件取得 aggregateType
		const domainEvent = event as any
		const aggregateType = domainEvent.aggregateType || 'Unknown'
		return `${aggregateType}.${eventName}`
	}
}
