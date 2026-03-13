/**
 * @file SystemWorker.ts
 * @description 統一的後台工作者，負責處理領域事件與通用 Job
 *
 * 實現 IQueueWorker 介面，支持優雅關閉與等待空閒。
 *
 * 設計原則：
 * - 使用 duck-typing 介面，解除對 RedisEventDispatcher/RedisJobQueueAdapter 具體型別的強耦合
 * - 支援 SIGTERM/SIGINT 信號的優雅關閉
 * - 實現 waitForIdle() 以等待當前 Job 完成
 */

import type { IQueueWorker } from './Jobs/IQueueWorker'
import type { IRedisService } from '../Infrastructure/Ports/Messaging/IRedisService'

/**
 * 事件分發器的最小介面定義（duck-typing）
 * 實現類無需明確繼承，只需實現相應方法即可
 */
interface EventDispatcher {
	executeHandlers(name: string, event: any): Promise<void>
}

/**
 * Job 隊列的最小介面定義（duck-typing）
 * 實現類無需明確繼承，只需實現相應方法即可
 */
interface JobQueue {
	execute(name: string, data: any): Promise<void>
}

/**
 * 系統工作者類別
 *
 * 實現 IQueueWorker 介面，提供統一的 Worker 管理能力
 */
export class SystemWorker implements IQueueWorker {
	private isRunning = false

	/**
	 * 當前正在執行的 Job/Event 計數
	 * 用於 waitForIdle() 的實現
	 */
	private activeJobs = 0

	/**
	 * Promise 隊列，用於 waitForIdle()
	 * 當 activeJobs 降至 0 時，resolve 這些 Promise
	 */
	private idleCallbacks: ((value: void) => void)[] = []

	private readonly queues = [
		{ key: 'domain_events_queue', type: 'event' },
		{ key: 'system_jobs_queue', type: 'job' },
	]

	/**
	 * 建構子
	 *
	 * @param redis - Redis 服務
	 * @param eventDispatcher - 事件分發器（使用 duck-typing，無需特定型別）
	 * @param jobQueue - Job 隊列（使用 duck-typing，無需特定型別）
	 */
	constructor(
		private readonly redis: IRedisService,
		private readonly eventDispatcher: EventDispatcher,
		private readonly jobQueue: JobQueue
	) {}

	/**
	 * 啟動工作者
	 *
	 * 為每個隊列啟動監聽循環
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
	 *
	 * 停止接受新的 Job，但不等待當前 Job 完成
	 * 若需等待當前 Job 完成，使用 waitForIdle()
	 */
	stop(): void {
		this.isRunning = false
	}

	/**
	 * 等待工作者進入空閒狀態
	 *
	 * 阻塞等待直到所有當前正在執行的 Job 完成
	 *
	 * @param timeout - 等待超時時間（毫秒），預設 30000（30 秒）
	 * @throws 若等待超時，拋出 TimeoutError
	 */
	async waitForIdle(timeout: number = 30000): Promise<void> {
		// 若已無活動 Job，直接返回
		if (this.activeJobs === 0) {
			return
		}

		// 建立 Promise，當 activeJobs 降至 0 時 resolve
		const idlePromise = new Promise<void>((resolve) => {
			this.idleCallbacks.push(resolve)
		})

		// 應用超時
		const timeoutPromise = new Promise<void>((_, reject) => {
			setTimeout(() => {
				reject(new Error(`Worker did not complete in ${timeout}ms`))
			}, timeout)
		})

		try {
			await Promise.race([idlePromise, timeoutPromise])
		} catch (error) {
			// 移除此 Promise 的 callback，避免無限掛起
			const index = this.idleCallbacks.indexOf(idlePromise as any)
			if (index > -1) {
				this.idleCallbacks.splice(index, 1)
			}
			throw error
		}
	}

	/**
	 * 監聽循環
	 *
	 * 不斷從隊列消費 Job/Event，直至 isRunning 為 false
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

				// 標記此 Job 開始執行
				this.activeJobs++

				try {
					if (type === 'event') {
						console.debug(`[SystemWorker] 處理領域事件: ${data.name}`)
						await this.eventDispatcher.executeHandlers(data.name, data.event)
					} else {
						console.debug(`[SystemWorker] 處理背景工作: ${data.name}`)
						await this.jobQueue.execute(data.name, data.data)
					}
				} finally {
					// 標記此 Job 完成執行
					this.activeJobs--

					// 若 activeJobs 降至 0，resolve 所有等待的 idle callbacks
					if (this.activeJobs === 0) {
						const callbacks = this.idleCallbacks.splice(0)
						callbacks.forEach((cb) => cb())
					}
				}
			} catch (error) {
				console.error(`[SystemWorker] 處理隊列 ${queueKey} 時發生錯誤:`, error)
				await new Promise((resolve) => setTimeout(resolve, 5000))
			}
		}
	}
}
