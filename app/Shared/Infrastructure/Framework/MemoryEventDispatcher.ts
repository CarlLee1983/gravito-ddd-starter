/**
 * @file MemoryEventDispatcher.ts
 * @description 內存領域事件分發器實作 (Adapter)
 * 
 * Role: Infrastructure Adapter
 */

import type { DomainEvent } from '../../Domain/DomainEvent'
import type { IEventDispatcher, EventHandler } from '../IEventDispatcher'

/**
 * 內存事件分發器
 * 
 * 負責在同一個執行序中同步或非同步地分發領域事件。
 */
export class MemoryEventDispatcher implements IEventDispatcher {
	private handlers: Map<string, EventHandler[]> = new Map()

	/**
	 * 分發事件
	 */
	async dispatch(events: DomainEvent | DomainEvent[]): Promise<void> {
		const eventList = Array.isArray(events) ? events : [events]

		for (const event of eventList) {
			const eventName = event.constructor.name
			const handlers = this.handlers.get(eventName) || []

			if (handlers.length === 0) {
				console.debug(`[EventDispatcher] 無人訂閱事件: ${eventName}`)
				continue
			}

			// 執行所有訂閱者處理函式
			await Promise.all(
				handlers.map(async (handler) => {
					try {
						await handler(event)
					} catch (error) {
						console.error(`[EventDispatcher] 處理事件 ${eventName} 時發生錯誤:`, error)
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
}
