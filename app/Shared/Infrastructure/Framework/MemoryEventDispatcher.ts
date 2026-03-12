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
	private logger: ILogger

	constructor(logger?: ILogger) {
		this.logger = logger || {
			debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
			info: (msg: string) => console.info(`[INFO] ${msg}`),
			warn: (msg: string) => console.warn(`[WARN] ${msg}`),
			error: (msg: string, err?: any) => console.error(`[ERROR] ${msg}`, err),
		} as any
	}

	/**
	 * 分發事件（DomainEvent 或 IntegrationEvent）
	 */
	async dispatch(events: Event | Event[]): Promise<void> {
		const eventList = Array.isArray(events) ? events : [events]

		for (const event of eventList) {
			const eventName = this.getEventName(event)
			const handlers = this.handlers.get(eventName) || []

			console.log('[MemoryEventDispatcher.dispatch] 分發事件:', {
				eventName,
				handlerCount: handlers.length,
				eventType: (event as any).eventType || (event as any).constructor.name,
			})

			if (handlers.length === 0) {
				this.logger.debug(`[EventDispatcher] 無人訂閱事件: ${eventName}`)
				continue
			}

			// 執行所有訂閱者處理函式
			await Promise.all(
				handlers.map(async (handler) => {
					try {
						console.log('[MemoryEventDispatcher] 執行訂閱者處理函式:', eventName)
						await handler(event)
					} catch (error) {
						console.error('[MemoryEventDispatcher] 處理函式執行失敗:', eventName, error)
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
	 * - IntegrationEvent: 使用 eventType（擁有 sourceContext 屬性）
	 * - DomainEvent: 使用 constructor.name
	 *
	 * 優先檢查 sourceContext 以避免序列化時的歧義
	 *
	 * @private
	 */
	private getEventName(event: Event): string {
		// IntegrationEvent 獨有 sourceContext 屬性（更明確的識別）
		if ('sourceContext' in event && typeof event.sourceContext === 'string') {
			return (event as IntegrationEvent).eventType
		}
		// DomainEvent
		return (event as DomainEvent).constructor.name
	}
}
