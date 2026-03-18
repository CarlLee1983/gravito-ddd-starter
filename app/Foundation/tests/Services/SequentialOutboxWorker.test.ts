/**
 * @file SequentialOutboxWorker.test.ts
 * @description SequentialOutboxWorker 集成測試
 *
 * 測試項目：
 * - 正常流程：啟動、掃描、處理、停止
 * - 重試機制：失敗項目自動重試
 * - DLQ 流程：超出重試次數進入 Dead Letter Queue
 * - 指標收集：驗證 metrics 正確更新
 * - 錯誤處理：異常不應中斷 Worker
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SequentialOutboxWorker } from '@/Foundation/Infrastructure/Services/SequentialOutboxWorker'
import { MemoryOutboxRepository } from '@/Foundation/Infrastructure/Repositories/MemoryOutboxRepository'
import { OutboxEntry } from '@/Foundation/Domain/Aggregates/OutboxEntry'
import type { IEventDispatcher } from '@/Foundation/Application/Ports/IEventDispatcher'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import type { IntegrationEvent } from '@/Foundation/Domain/IntegrationEvent'

// Mock 實現
const createMockEventDispatcher = () => {
	const dispatchFn = vi.fn()
	return {
		subscribe: vi.fn(),
		unsubscribe: vi.fn(),
		dispatch: dispatchFn,
	} as any
}

const createMockLogger = (): ILogger => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
})

const mockIntegrationEvent = (id: string): IntegrationEvent => ({
	eventId: `evt-${id}`,
	eventName: 'OrderPlaced',
	aggregateId: `order-${id}`,
	aggregateType: 'Order',
	occurredAt: new Date(),
	toJSON: () => ({
		eventId: `evt-${id}`,
		eventName: 'OrderPlaced',
		aggregateId: `order-${id}`,
		aggregateType: 'Order',
		occurredAt: new Date().toISOString(),
	}),
})

describe('SequentialOutboxWorker 集成測試', () => {
	let worker: SequentialOutboxWorker
	let repository: MemoryOutboxRepository
	let dispatcher: IEventDispatcher
	let logger: ILogger

	beforeEach(() => {
		repository = new MemoryOutboxRepository()
		dispatcher = createMockEventDispatcher()
		logger = createMockLogger()

		worker = new SequentialOutboxWorker(repository, dispatcher, logger, 100)
	})

	afterEach(async () => {
		if (worker.isRunning && typeof worker.isRunning === 'function' && worker.isRunning()) {
			await worker.stop()
		}
	})

	describe('正常流程：啟動、掃描、處理、停止', () => {
		it('應成功啟動 Worker', async () => {
			await worker.start()

			expect(worker.isRunning()).toBe(true)
			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('啟動'), expect.any(Object))

			await worker.stop()
		})

		it('應成功停止 Worker', async () => {
			await worker.start()
			await worker.stop()

			expect(worker.isRunning()).toBe(false)
			expect(logger.info).toHaveBeenCalledWith('SequentialOutboxWorker 已停止')
		})

		it('應處理待處理的 Outbox 項目', async () => {
			const entry = OutboxEntry.createNew(
				'outbox-001',
				'evt-001',
				'order-001',
				'Order',
				'OrderPlaced',
				mockIntegrationEvent('001')
			);
			await repository.save(entry);

			(dispatcher.dispatch as any).mockResolvedValue(undefined);

			const processed = await worker.processNextBatch(10)

			expect(processed).toBe(1)
			expect(dispatcher.dispatch).toHaveBeenCalledWith(entry.payload)
			expect(logger.debug).toHaveBeenCalled()

			const saved = await repository.findById('outbox-001')
			expect(saved?.isProcessed()).toBe(true)
		})

		it('應正確計數已處理項目', async () => {
			const entries = []
			for (let i = 1; i <= 3; i++) {
				const entry = OutboxEntry.createNew(
					`outbox-00${i}`,
					`evt-00${i}`,
					`order-00${i}`,
					'Order',
					'OrderPlaced',
					mockIntegrationEvent(String(i))
				)
				entries.push(entry)
				await repository.save(entry)
			}

			(dispatcher.dispatch as any).mockResolvedValue(undefined)

			const processed = await worker.processNextBatch(10)

			expect(processed).toBe(3)

			const unprocessed = await repository.findUnprocessed()
			expect(unprocessed).toHaveLength(0)
		})
	})

	describe('重試機制：失敗項目自動重試', () => {
		it('應處理分派失敗的項目', async () => {
			const entry = OutboxEntry.createNew(
				'outbox-001',
				'evt-001',
				'order-001',
				'Order',
				'OrderPlaced',
				mockIntegrationEvent('001')
			)
			await repository.save(entry);

			(dispatcher.dispatch as any).mockRejectedValue(new Error('Network timeout'))

			const processed = await worker.processNextBatch(10)

			expect(processed).toBe(1)

			const saved = await repository.findById('outbox-001')
			expect(saved?.isFailed()).toBe(true)
			expect(saved?.retryCount).toBe(1)
			expect(saved?.lastError).toContain('Network timeout')
		})

		it('應重試失敗項目', async () => {
			const entry = OutboxEntry.createNew(
				'outbox-001',
				'evt-001',
				'order-001',
				'Order',
				'OrderPlaced',
				mockIntegrationEvent('001')
			)
			await repository.save(entry);

			(dispatcher.dispatch as any).mockRejectedValueOnce(new Error('Error 1'))

			await worker.processNextBatch(10)

			let saved = await repository.findById('outbox-001')
			expect(saved?.retryCount).toBe(1);
			expect(saved?.isFailed()).toBe(true);

			(dispatcher.dispatch as any).mockResolvedValueOnce(undefined);

			const retried = await worker.retryFailed(3, 20)

			expect(retried).toBe(1)

			saved = await repository.findById('outbox-001')
			expect(saved?.isProcessed()).toBe(true)
			expect(saved?.retryCount).toBe(1)
		})

		it('應在重試失敗時更新錯誤信息', async () => {
			const entry = OutboxEntry.createNew(
				'outbox-001',
				'evt-001',
				'order-001',
				'Order',
				'OrderPlaced',
				mockIntegrationEvent('001')
			)
			await repository.save(entry);

			(dispatcher.dispatch as any).mockRejectedValueOnce(new Error('Error 1'));
			await worker.processNextBatch(10);

			(dispatcher.dispatch as any).mockRejectedValueOnce(new Error('Error 2'));
			await worker.retryFailed(3, 20);

			const saved = await repository.findById('outbox-001');
			expect(saved?.lastError).toContain('Error 2');
			expect(saved?.retryCount).toBe(2)
		})
	})

	describe('DLQ 流程：超出重試次數進入 Dead Letter Queue', () => {
		it('應識別需進入 DLQ 的項目', async () => {
			const entry = OutboxEntry.createNew(
				'outbox-001',
				'evt-001',
				'order-001',
				'Order',
				'OrderPlaced',
				mockIntegrationEvent('001')
			)

			let current = entry
			for (let i = 0; i < 4; i++) {
				current = current.markAsFailed(`Error ${i}`)
			}

			await repository.save(current)

			const dlqEntries = await repository.findByDeadLetterQueue(3)

			expect(dlqEntries).toHaveLength(1)
			expect(dlqEntries[0].id).toBe('outbox-001')
			expect(dlqEntries[0].retryCount).toBe(4)
		})

		it('應在 moveToDeadLetterQueue 時記錄警告', async () => {
			const entry = OutboxEntry.createNew(
				'outbox-001',
				'evt-001',
				'order-001',
				'Order',
				'OrderPlaced',
				mockIntegrationEvent('001')
			)

			let current = entry
			for (let i = 0; i < 4; i++) {
				current = current.markAsFailed('Error')
			}

			await repository.save(current)

			const movedCount = await worker.moveToDeadLetterQueue(3)

			expect(movedCount).toBe(1)
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Dead Letter Queue'),
				expect.any(Object)
			)
		})

		it('應防止超限項目重試', async () => {
			const entry = OutboxEntry.createNew(
				'outbox-001',
				'evt-001',
				'order-001',
				'Order',
				'OrderPlaced',
				mockIntegrationEvent('001')
			)

			let current = entry
			for (let i = 0; i < 5; i++) {
				current = current.markAsFailed('Error')
			}

			await repository.save(current);

			(dispatcher.dispatch as any).mockResolvedValue(undefined)

			const retried = await worker.retryFailed(3, 20)

			expect(retried).toBe(0)
			expect(dispatcher.dispatch).not.toHaveBeenCalled()
		})
	})

	describe('指標收集：驗證 metrics 正確更新', () => {
		it('應在處理時更新指標', async () => {
			for (let i = 1; i <= 3; i++) {
				const entry = OutboxEntry.createNew(
					`outbox-00${i}`,
					`evt-00${i}`,
					`order-00${i}`,
					'Order',
					'OrderPlaced',
					mockIntegrationEvent(String(i))
				)
				await repository.save(entry)
			}

			(dispatcher.dispatch as any).mockResolvedValue(undefined)

			await worker.processNextBatch(10)

			const metrics = await worker.getMetrics()

			expect(metrics.processed).toBe(3)
			expect(metrics.successful).toBe(3)
			expect(metrics.failed).toBe(0)
			expect(metrics.pendingCount).toBe(0)
		})

		it('應正確計算平均處理時間', async () => {
			const entry = OutboxEntry.createNew(
				'outbox-001',
				'evt-001',
				'order-001',
				'Order',
				'OrderPlaced',
				mockIntegrationEvent('001')
			)
			await repository.save(entry);

			(dispatcher.dispatch as any).mockResolvedValue(undefined)

			await worker.processNextBatch(10)

			const metrics = await worker.getMetrics()

			expect(metrics.averageProcessingTimeMs).toBeGreaterThanOrEqual(0)
			expect(metrics.lastProcessedAt).toBeDefined()
		})

		it('應重設指標', async () => {
			for (let i = 1; i <= 2; i++) {
				const entry = OutboxEntry.createNew(
					`outbox-00${i}`,
					`evt-00${i}`,
					`order-00${i}`,
					'Order',
					'OrderPlaced',
					mockIntegrationEvent(String(i))
				)
				await repository.save(entry)
			}

			(dispatcher.dispatch as any).mockResolvedValue(undefined)
			await worker.processNextBatch(10)

			let metrics = await worker.getMetrics()
			expect(metrics.processed).toBe(2)

			await worker.resetMetrics()

			metrics = await worker.getMetrics()
			expect(metrics.processed).toBe(0)
			expect(metrics.successful).toBe(0)
			expect(metrics.failed).toBe(0)
		})
	})

	describe('錯誤處理：異常不應中斷 Worker', () => {
		it('應優雅處理分派異常', async () => {
			const entry = OutboxEntry.createNew(
				'outbox-001',
				'evt-001',
				'order-001',
				'Order',
				'OrderPlaced',
				mockIntegrationEvent('001')
			)
			await repository.save(entry);

			(dispatcher.dispatch as any).mockRejectedValue(new Error('Critical error'))

			const processed = await worker.processNextBatch(10)

			expect(processed).toBe(1)
			expect(logger.warn).toHaveBeenCalled()

			expect(worker.isRunning()).toBe(false)
		})

		it('重複啟動 Worker 應返回', async () => {
			await worker.start()
			await worker.start()

			expect(worker.isRunning()).toBe(true)
			expect(logger.warn).toHaveBeenCalledWith('SequentialOutboxWorker 已在運行中')

			await worker.stop()
		})

		it('重複停止 Worker 應返回', async () => {
			await worker.start()
			await worker.stop()
			await worker.stop()

			expect(worker.isRunning()).toBe(false)
		})
	})

	describe('邊界情況', () => {
		it('空 Outbox 應返回 0', async () => {
			const processed = await worker.processNextBatch(10)

			expect(processed).toBe(0)
		})

		it('無失敗項目時 retryFailed 應返回 0', async () => {
			const entry = OutboxEntry.createNew(
				'outbox-001',
				'evt-001',
				'order-001',
				'Order',
				'OrderPlaced',
				mockIntegrationEvent('001')
			)
			await repository.save(entry)

			const retried = await worker.retryFailed(3, 20)

			expect(retried).toBe(0)
		})

		it('無 DLQ 項目時 moveToDeadLetterQueue 應返回 0', async () => {
			const entry = OutboxEntry.createNew(
				'outbox-001',
				'evt-001',
				'order-001',
				'Order',
				'OrderPlaced',
				mockIntegrationEvent('001')
			)
			await repository.save(entry)

			const movedCount = await worker.moveToDeadLetterQueue(3)

			expect(movedCount).toBe(0)
		})
	})
})
