/**
 * @file SequentialOutboxWorker.ts
 * @description 序列化 Outbox Worker 實現
 *
 * 定期掃描 Outbox 隊列並分派待處理的事件。
 * 支援重試機制與 Dead Letter Queue 流程。
 */

import type { IOutboxWorker, OutboxWorkerMetrics } from '../../Application/Ports/IOutboxWorker'
import type { IOutboxRepository } from '../../Domain/Repositories/IOutboxRepository'
import type { IEventDispatcher } from '../../Application/Ports/IEventDispatcher'
import type { ILogger } from '../Ports/Services/ILogger'

/**
 * 序列化 Outbox Worker 實現
 *
 * 特點：
 * - 序列處理：一次處理一個項目（簡單但可靠）
 * - 定期掃描：默認 2 秒掃描一次
 * - 重試機制：失敗項目自動重試（最多 3 次）
 * - 死信隊列：超過重試次數的項目進入 DLQ
 * - 指標收集：記錄處理統計信息
 */
export class SequentialOutboxWorker implements IOutboxWorker {
	// 狀態
	private running: boolean = false
	private scanInterval: number = 2000 // 2 秒掃描一次
	private scanTimer: NodeJS.Timer | null = null
	private retryTimer: NodeJS.Timer | null = null
	private dlqTimer: NodeJS.Timer | null = null

	// 指標
	private metrics: {
		processed: number
		successful: number
		failed: number
		movedToDeadLetterQueue: number
		lastProcessedAt: Date
		startTime: Date
		totalProcessingTimeMs: number
		pendingCount: number
		failedCount: number
	} = {
		processed: 0,
		successful: 0,
		failed: 0,
		movedToDeadLetterQueue: 0,
		lastProcessedAt: new Date(),
		startTime: new Date(),
		totalProcessingTimeMs: 0,
		pendingCount: 0,
		failedCount: 0,
	}

	constructor(
		private readonly outboxRepository: IOutboxRepository,
		private readonly eventDispatcher: IEventDispatcher,
		private readonly logger: ILogger,
		scanIntervalMs: number = 2000
	) {
		this.scanInterval = scanIntervalMs
	}

	/**
	 * 啟動 Worker（開始定期掃描）
	 */
	async start(): Promise<void> {
		if (this.running) {
			this.logger.warn('SequentialOutboxWorker 已在運行中')
			return
		}

		this.running = true
		this.metrics.startTime = new Date()

		this.logger.info('SequentialOutboxWorker 已啟動', {
			scanIntervalMs: this.scanInterval,
		})

		// 定期掃描待處理項目
		this.scanTimer = setInterval(() => {
			this.processNextBatch().catch((error) => {
				this.logger.error('Outbox Worker 掃描失敗', {
					error: String(error),
				})
			})
		}, this.scanInterval)

		// 定期重試失敗項目（每 30 秒）
		this.retryTimer = setInterval(() => {
			this.retryFailed(3, 20).catch((error) => {
				this.logger.error('Outbox Worker 重試失敗', {
					error: String(error),
				})
			})
		}, 30000)

		// 定期移至 DLQ（每 1 分鐘）
		this.dlqTimer = setInterval(() => {
			this.moveToDeadLetterQueue(3).catch((error) => {
				this.logger.error('Outbox Worker DLQ 移動失敗', {
					error: String(error),
				})
			})
		}, 60000)
	}

	/**
	 * 停止 Worker（停止定期掃描）
	 */
	async stop(): Promise<void> {
		if (!this.running) {
			return
		}

		this.running = false

		if (this.scanTimer) {
			clearInterval(this.scanTimer)
			this.scanTimer = null
		}
		if (this.retryTimer) {
			clearInterval(this.retryTimer)
			this.retryTimer = null
		}
		if (this.dlqTimer) {
			clearInterval(this.dlqTimer)
			this.dlqTimer = null
		}

		this.logger.info('SequentialOutboxWorker 已停止')
	}

	/**
	 * 處理下一批 Outbox 項目
	 *
	 * 可在 Worker 運行時或手動調用時使用（例如測試場景）
	 *
	 * 去重邏輯：在同一批次中，相同 eventId 只分派一次
	 */
	async processNextBatch(batchSize: number = 50): Promise<number> {

		const startTime = Date.now()

		try {
			// 查詢待處理項目
			const entries = await this.outboxRepository.findUnprocessed(batchSize)

			if (entries.length === 0) {
				return 0
			}

			let successful = 0
			let failed = 0
			const processedEventIds = new Set<string>() // 批次級去重

			// 逐個處理
			for (const entry of entries) {
				// 去重檢查：如果該 eventId 在本批次已處理過，則跳過
				if (processedEventIds.has(entry.eventId)) {
					this.logger.debug('Outbox 項目被去重跳過', {
						eventId: entry.eventId,
						reason: '相同 eventId 已在本批次分派',
					})
					continue
				}

				try {
					// 分派事件
					await this.eventDispatcher.dispatch(entry.payload)

					// 標記為已處理
					const processed = entry.markAsProcessed()
					await this.outboxRepository.save(processed)

					// 記錄該 eventId 已處理
					processedEventIds.add(entry.eventId)

					successful++
					this.metrics.successful++
				} catch (error) {
					// 標記為失敗
					const failedEntry = entry.markAsFailed(String(error))
					await this.outboxRepository.save(failedEntry)

					failed++
					this.metrics.failed++

					this.logger.warn('Outbox 項目分派失敗', {
						eventId: entry.eventId,
						aggregateType: entry.aggregateType,
						error: String(error),
						retryCount: failedEntry.retryCount,
					})
				}
			}

			// 更新指標
			const processingTime = Date.now() - startTime
			this.metrics.processed += entries.length
			this.metrics.lastProcessedAt = new Date()
			this.metrics.totalProcessingTimeMs += processingTime

			const stats = await this.outboxRepository.getStats()
			this.metrics.pendingCount = stats.pending
			this.metrics.failedCount = stats.failed

			if (successful > 0 || failed > 0) {
				this.logger.debug('Outbox Worker 批次完成', {
					total: entries.length,
					successful,
					failed,
					processingTimeMs: processingTime,
				})
			}

			return entries.length
		} catch (error) {
			this.logger.error('Outbox Worker processNextBatch 異常', {
				error: String(error),
			})
			return 0
		}
	}

	/**
	 * 重試失敗的項目
	 */
	async retryFailed(maxRetries: number = 3, batchSize: number = 20): Promise<number> {
		try {
			const failed = await this.outboxRepository.findFailed(batchSize)

			if (failed.length === 0) {
				return 0
			}

			let retried = 0

			for (const entry of failed) {
				// 只重試未超過上限的項目
				if (entry.retryCount > maxRetries) {
					continue
				}

				try {
					// 分派事件
					await this.eventDispatcher.dispatch(entry.payload)

					// 標記為已處理
					const processed = entry.markAsProcessed()
					await this.outboxRepository.save(processed)

					retried++
					this.metrics.successful++

					this.logger.debug('Outbox 項目重試成功', {
						eventId: entry.eventId,
						retryCount: entry.retryCount,
					})
				} catch (error) {
					// 重試仍失敗，更新錯誤信息
					const failedEntry = entry.markAsFailed(String(error))
					await this.outboxRepository.save(failedEntry)

					this.logger.warn('Outbox 項目重試失敗', {
						eventId: entry.eventId,
						retryCount: failedEntry.retryCount,
						error: String(error),
					})
				}
			}

			return retried
		} catch (error) {
			this.logger.error('Outbox Worker retryFailed 異常', {
				error: String(error),
			})
			return 0
		}
	}

	/**
	 * 將超出最大重試次數的項目移至 Dead Letter Queue
	 *
	 * 注：在實現中，DLQ 項目仍存儲在 outbox 表中（status='failed'），
	 * 但被標記為不再自動重試。實際可以將 status 改為 'dlq' 用於區分。
	 */
	async moveToDeadLetterQueue(maxRetries: number = 3): Promise<number> {
		try {
			const dlqEntries = await this.outboxRepository.findByDeadLetterQueue(maxRetries)

			// 簡單計數返回，實際應用中可能需要額外的 DLQ 存儲或通知
			if (dlqEntries.length > 0) {
				this.logger.warn('Outbox Dead Letter Queue 中有項目', {
					count: dlqEntries.length,
					entries: dlqEntries.map((e) => ({
						eventId: e.eventId,
						retryCount: e.retryCount,
						lastError: e.lastError,
					})),
				})

				this.metrics.movedToDeadLetterQueue += dlqEntries.length
			}

			return dlqEntries.length
		} catch (error) {
			this.logger.error('Outbox Worker moveToDeadLetterQueue 異常', {
				error: String(error),
			})
			return 0
		}
	}

	/**
	 * 獲取 Worker 運行指標
	 */
	async getMetrics(): Promise<OutboxWorkerMetrics> {
		const stats = await this.outboxRepository.getStats()

		const uptime = Date.now() - this.metrics.startTime.getTime()
		const averageProcessingTimeMs =
			this.metrics.processed > 0 ? this.metrics.totalProcessingTimeMs / this.metrics.processed : 0

		return {
			processed: this.metrics.processed,
			successful: this.metrics.successful,
			failed: this.metrics.failed,
			movedToDeadLetterQueue: this.metrics.movedToDeadLetterQueue,
			lastProcessedAt: this.metrics.lastProcessedAt,
			averageProcessingTimeMs,
			pendingCount: stats.pending,
			failedCount: stats.failed,
		}
	}

	/**
	 * 重設指標計數器
	 */
	async resetMetrics(): Promise<void> {
		this.metrics = {
			processed: 0,
			successful: 0,
			failed: 0,
			movedToDeadLetterQueue: 0,
			lastProcessedAt: new Date(),
			startTime: new Date(),
			totalProcessingTimeMs: 0,
			pendingCount: 0,
			failedCount: 0,
		}

		this.logger.info('Outbox Worker 指標已重設')
	}

	/**
	 * 檢查 Worker 是否正在運行
	 */
	isRunning(): boolean {
		return this.running
	}
}
