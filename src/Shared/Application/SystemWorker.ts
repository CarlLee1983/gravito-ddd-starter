/**
 * @file SystemWorker.ts
 * @description 統一的後台工作者，負責處理領域事件與通用 Job
 */

import type { IRedisService } from '../Infrastructure/IRedisService'
import type { RedisEventDispatcher } from '../Infrastructure/Framework/RedisEventDispatcher'
import type { RedisJobQueueAdapter } from '../Infrastructure/Framework/RedisJobQueueAdapter'

/**
 * 系統工作者類別
 */
export class SystemWorker {
	private isRunning = false
	private readonly queues = [
		{ key: 'domain_events_queue', type: 'event' },
		{ key: 'system_jobs_queue', type: 'job' }
	]

	constructor(
		private readonly redis: IRedisService,
		private readonly eventDispatcher: RedisEventDispatcher,
		private readonly jobQueue: RedisJobQueueAdapter
	) {}

	/**
	 * 啟動工作者
	 */
	async start(): Promise<void> {
		if (this.isRunning) return
		this.isRunning = true
		console.log('🚀 [SystemWorker] 後台工作處理器啟動...')

		// 為每個隊列啟動監聽循環
		this.queues.forEach((q) => this.loop(q.key, q.type))
	}

	/**
	 * 停止工作者
	 */
	stop(): void {
		this.isRunning = false
	}

	/**
	 * 監聽循環
	 * 
	 * @param queueKey - Redis List Key
	 * @param type - 處理類型 ('event' | 'job')
	 */
	private async loop(queueKey: string, type: string): Promise<void> {
		while (this.isRunning) {
			try {
				const payload = await this.redis.lpop(queueKey)

				if (!payload) {
					// 採用短暫休眠避免 CPU 負載過高
					await new Promise((resolve) => setTimeout(resolve, 1000))
					continue
				}

				const data = JSON.parse(payload)

				if (type === 'event') {
					console.debug(`[SystemWorker] 處理領域事件: ${data.name}`)
					await this.eventDispatcher.executeHandlers(data.name, data.event)
				} else {
					console.debug(`[SystemWorker] 處理背景工作: ${data.name}`)
					await this.jobQueue.execute(data.name, data.data)
				}
			} catch (error) {
				console.error(`[SystemWorker] 處理隊列 ${queueKey} 時發生錯誤:`, error)
				await new Promise((resolve) => setTimeout(resolve, 5000))
			}
		}
	}
}
