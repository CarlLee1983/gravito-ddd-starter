/**
 * @file EventWorker.ts
 * @description 監聽 Redis 隊列並執行領域事件處理程序的後台工作者
 */

import type { IRedisService } from '../Infrastructure/IRedisService'
import type { RedisEventDispatcher } from '../Infrastructure/Framework/RedisEventDispatcher'

/**
 * 領域事件工作者
 */
export class EventWorker {
	private readonly queueKey = 'domain_events_queue'
	private isRunning = false

	constructor(
		private readonly redis: IRedisService,
		private readonly dispatcher: RedisEventDispatcher
	) {}

	/**
	 * 啟動工作者
	 */
	async start(): Promise<void> {
		if (this.isRunning) return
		this.isRunning = true
		console.log('🚀 [EventWorker] 領域事件處理器啟動...')

		// 進入持續監聽循環
		this.loop()
	}

	/**
	 * 停止工作者
	 */
	stop(): void {
		this.isRunning = false
	}

	/**
	 * 工作者循環
	 */
	private async loop(): Promise<void> {
		while (this.isRunning) {
			try {
				// 從 Redis 隊列彈出消息
				const payload = await this.redis.lpop(this.queueKey)

				if (!payload) {
					// 若無消息，稍候再試 (避免 CPU 空轉)
					await new Promise((resolve) => setTimeout(resolve, 1000))
					continue
				}

				const { name, event } = JSON.parse(payload)
				console.debug(`[EventWorker] 正在處理事件: ${name}`)

				// 執行分發器中的訂閱者
				await this.dispatcher.executeHandlers(name, event)
			} catch (error) {
				console.error('[EventWorker] 循環執行時發生錯誤:', error)
				await new Promise((resolve) => setTimeout(resolve, 5000))
			}
		}
	}
}
