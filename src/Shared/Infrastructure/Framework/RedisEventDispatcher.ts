/**
 * @file RedisEventDispatcher.ts
 * @description 基於 Redis 的非同步領域事件分發器
 * 
 * Role: Infrastructure Adapter
 */

import type { DomainEvent } from '../../Domain/DomainEvent'
import type { IEventDispatcher, EventHandler } from '../IEventDispatcher'
import type { IRedisService } from '../IRedisService'

/**
 * Redis 事件分發器
 * 
 * 使用 Redis 列表作為消息隊列，實現非同步的事件處理。
 */
export class RedisEventDispatcher implements IEventDispatcher {
	private readonly queueKey = 'domain_events_queue'
	private handlers: Map<string, EventHandler[]> = new Map()

	/**
	 * 建構子
	 * @param redis - Redis 服務實例
	 */
	constructor(private readonly redis: IRedisService) {}

	/**
	 * 分發事件：將事件序列化後推入 Redis 隊列
	 */
	async dispatch(events: DomainEvent | DomainEvent[]): Promise<void> {
		const eventList = Array.isArray(events) ? events : [events]

		for (const event of eventList) {
			const payload = JSON.stringify({
				name: event.constructor.name,
				event: event.toJSON()
			})

			await this.redis.rpush(this.queueKey, payload)
			console.debug(`[RedisEventDispatcher] 事件已推入隊列: ${event.constructor.name}`)
		}
	}

	/**
	 * 訂閱事件：維護本地處理程序
	 * 注意：在 Redis 模式下，處理程序的觸發由外部 Worker 調用此實例的執行方法。
	 */
	subscribe(eventName: string, handler: EventHandler): void {
		if (!this.handlers.has(eventName)) {
			this.handlers.set(eventName, [])
		}
		this.handlers.get(eventName)!.push(handler)
	}

	/**
	 * 執行處理程序 (供 Worker 調用)
	 * @internal
	 */
	async executeHandlers(eventName: string, eventData: any): Promise<void> {
		const handlers = this.handlers.get(eventName) || []
		
		await Promise.all(
			handlers.map(async (handler) => {
				try {
					await handler(eventData)
				} catch (error) {
					console.error(`[RedisEventDispatcher] 執行 ${eventName} 處理程序失敗:`, error)
				}
			})
		)
	}
}
