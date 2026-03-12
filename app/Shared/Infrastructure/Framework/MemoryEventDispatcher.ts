/**
 * @file MemoryEventDispatcher.ts
 * @description 內存事件分發器實作 (Adapter)
 *
 * 支援分發 DomainEvent 和 IntegrationEvent
 * Role: Infrastructure Adapter
 */

import type { DomainEvent } from '../../Domain/DomainEvent'
import type { IntegrationEvent } from '../../Domain/IntegrationEvent'
import type { IEventDispatcher, Event, EventHandler } from '../IEventDispatcher'
import type { ILogger } from '../ILogger'

/**
 * 內存事件分發器
 *
 * 負責在同一個執行序中同步或非同步地分發領域事件和整合事件。
 */
export class MemoryEventDispatcher implements IEventDispatcher {
	private handlers: Map<string, EventHandler[]> = new Map()

	constructor(private logger: ILogger) {}

	/**
	 * 分發事件（DomainEvent 或 IntegrationEvent）
	 */
	async dispatch(events: Event | Event[]): Promise<void> {
		const eventList = Array.isArray(events) ? events : [events]

		for (const event of eventList) {
			const eventName = this.getEventName(event)
			const handlers = this.handlers.get(eventName) || []

			if (handlers.length === 0) {
				this.logger.debug(`[EventDispatcher] 無人訂閱事件: ${eventName}`)
				continue
			}

			// 執行所有訂閱者處理函式
			await Promise.all(
				handlers.map(async (handler) => {
					try {
						await handler(event)
					} catch (error) {
						this.logger.error(`[EventDispatcher] 處理事件 ${eventName} 時發生錯誤`, error instanceof Error ? error : new Error(String(error)))
					}
				})
			)
		}
	}

	/**
	 * 訂閱事件
	 */
	subscribe(eventName: string, handler: EventHandler): void {
		if (!this.handlers.has(eventName)) {
			this.handlers.set(eventName, [])
		}
		this.handlers.get(eventName)!.push(handler)
	}

	/**
	 * 提取事件名稱
	 * - DomainEvent: 使用 constructor.name
	 * - IntegrationEvent: 使用 eventType
	 *
	 * @private
	 */
	private getEventName(event: Event): string {
		if ('eventType' in event && typeof event.eventType === 'string') {
			// IntegrationEvent
			return event.eventType
		}
		// DomainEvent
		return (event as DomainEvent).constructor.name
	}
}
