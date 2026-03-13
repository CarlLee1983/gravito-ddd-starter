/**
 * @file RedisEventDispatcher.ts
 * @description 基於 Redis 的非同步領域事件分發器
 *
 * 特點：
 * - 非同步分發，事件推入 Redis 列表
 * - 由外部 Worker (SystemWorker) 消費隊列並執行 Handler
 * - 支援重試機制（指數退避）
 * - 失敗事件記錄到死信隊列
 *
 * Role: Infrastructure Adapter
 */

import type { Event } from '../../Ports/Messaging/IEventDispatcher'
import type { IRedisService } from '../../Ports/Messaging/IRedisService'
import { BaseEventDispatcher } from './BaseEventDispatcher'

/**
 * Redis 事件分發器
 *
 * 使用 Redis 列表作為消息隊列，實現非同步的事件處理。
 * 與 SystemWorker 配合，實現事件的異步執行。
 */
export class RedisEventDispatcher extends BaseEventDispatcher {
	private readonly queueKey = 'domain_events_queue'

	/**
	 * 建構子
	 * @param redis - Redis 服務實例
	 */
	constructor(private readonly redis: IRedisService) {
		super()
	}

	/**
	 * 分發事件：將事件序列化後推入 Redis 隊列
	 *
	 * 此方法僅負責將事件推入隊列，不執行 Handler。
	 * Handler 的執行由 SystemWorker 透過呼叫 executeHandlers() 進行。
	 */
	async dispatch(events: Event | Event[]): Promise<void> {
		const eventList = Array.isArray(events) ? events : [events]

		for (const event of eventList) {
			const eventName = this.getEventName(event)
			const serialized = this.serializeEvent(event)

			const payload = JSON.stringify({
				name: eventName,
				event: serialized,
				timestamp: new Date().toISOString(),
			})

			await this.redis.rpush(this.queueKey, payload)
			console.debug(`[RedisEventDispatcher] 事件已推入隊列: ${eventName}`)
		}
	}

	/**
	 * 執行處理程序 (供 SystemWorker 調用)
	 *
	 * @param eventName - 事件名稱
	 * @param eventData - 事件數據
	 * @internal 僅供 SystemWorker 使用，不應直接呼叫
	 *
	 * 使用基類的 executeHandlers（包含失敗重試邏輯）
	 */
	public async executeHandlers(eventName: string, eventData: any): Promise<void> {
		console.log(`[RedisEventDispatcher] 執行 ${eventName} 的所有 Handler`)
		await super.executeHandlers(eventName, eventData)
	}
}
