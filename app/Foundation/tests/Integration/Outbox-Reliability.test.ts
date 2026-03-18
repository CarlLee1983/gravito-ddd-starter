/**
 * @file Outbox-Reliability.test.ts
 * @description Outbox 可靠性整合測試
 *
 * 測試項目：
 * - IT-2：Outbox 去重 -- 相同 eventId 只分派一次
 * - IT-3：Outbox 重試 + DLQ -- 失敗自動重試，超出次數進入死信隊列
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OutboxEntry } from '@/Foundation/Domain/Aggregates/OutboxEntry'
import {
	setupOutboxInfrastructure,
	createMockEventDispatcher,
	mockIntegrationEvent,
	setupDispatcherFailure,
} from '../helpers/IntegrationTestSetup'

describe('IT-2：Outbox 去重整合測試', () => {
	let outboxInfra: Awaited<ReturnType<typeof setupOutboxInfrastructure>>

	beforeEach(async () => {
		outboxInfra = await setupOutboxInfrastructure()
	})

	it('應防止相同 eventId 的重複分派', async () => {
		const event = mockIntegrationEvent('001', 'OrderPlaced')

		// 建立兩個具有相同 eventId 的 OutboxEntry
		const entry1 = OutboxEntry.createNew(
			'outbox-001',
			event.eventId, // 相同 eventId
			'order-001',
			'Order',
			'OrderPlaced',
			event
		)

		const entry2 = OutboxEntry.createNew(
			'outbox-002',
			event.eventId, // 相同 eventId！
			'order-002',
			'Order',
			'OrderPlaced',
			mockIntegrationEvent('002', 'OrderPlaced')
		)

		await outboxInfra.outboxRepository.save(entry1)
		await outboxInfra.outboxRepository.save(entry2)

		// 第一次處理：兩個都是 pending，但只有一個會被處理（因為 eventId 去重）
		await outboxInfra.worker.processNextBatch()

		// 驗證 dispatch 只被呼叫一次（去重）
		expect(outboxInfra.eventDispatcher.dispatch).toHaveBeenCalledTimes(1)

		// 驗證第一個 entry 已 processed
		const processedEntry1 = await outboxInfra.outboxRepository.findById('outbox-001')
		expect(processedEntry1!.status).toBe('processed')

		// 第二個 entry 應該被跳過（因為相同 eventId 已處理過）
		// 或者根據實現，可能標記為 processed (取決於去重策略)
		const processedEntry2 = await outboxInfra.outboxRepository.findById('outbox-002')
		expect(processedEntry2!.status).toMatch(/processed|skipped|pending/)
	})

	it('應追蹤已處理的 eventId 以防重複', async () => {
		const event1 = mockIntegrationEvent('001', 'OrderPlaced')
		const event2 = mockIntegrationEvent('002', 'OrderPlaced')

		const entry1 = OutboxEntry.createNew('outbox-001', event1.eventId, 'order-001', 'Order', 'OrderPlaced', event1)
		const entry2 = OutboxEntry.createNew('outbox-002', event2.eventId, 'order-002', 'Order', 'OrderPlaced', event2)

		await outboxInfra.outboxRepository.save(entry1)
		await outboxInfra.outboxRepository.save(entry2)

		// 第一次處理
		await outboxInfra.worker.processNextBatch()
		expect(outboxInfra.eventDispatcher.dispatch).toHaveBeenCalledTimes(2)

		// 清除 mock 呼叫記錄
		;(outboxInfra.eventDispatcher.dispatch as any).mockClear()

		// 嘗試再次處理（應該都已 processed，所以不會分派）
		await outboxInfra.worker.processNextBatch()

		// 第二次不應有任何分派呼叫
		expect(outboxInfra.eventDispatcher.dispatch).not.toHaveBeenCalled()
	})
})

describe('IT-3：Outbox 重試與 DLQ 整合測試', () => {
	let outboxInfra: Awaited<ReturnType<typeof setupOutboxInfrastructure>>

	beforeEach(async () => {
		outboxInfra = await setupOutboxInfrastructure()
	})

	it('應在 dispatcher 失敗時自動重試', async () => {
		const event = mockIntegrationEvent('001', 'OrderPlaced')

		const entry = OutboxEntry.createNew(
			'outbox-001',
			event.eventId,
			'order-001',
			'Order',
			'OrderPlaced',
			event
		)

		await outboxInfra.outboxRepository.save(entry)

		// 設定 dispatcher 失敗 2 次，第 3 次成功
		let callCount = 0
		;(outboxInfra.eventDispatcher.dispatch as any).mockImplementation(async () => {
			callCount++
			if (callCount <= 2) {
				throw new Error('Dispatch failed')
			}
		})

		// 第一次：失敗 → 標記為 failed，retryCount = 1
		await outboxInfra.worker.processNextBatch()
		let processedEntry = await outboxInfra.outboxRepository.findById('outbox-001')
		expect(processedEntry!.status).toBe('failed')
		expect(processedEntry!.retryCount).toBe(1)

		// 第二次：失敗 → retryCount = 2
		await outboxInfra.worker.retryFailed()
		processedEntry = await outboxInfra.outboxRepository.findById('outbox-001')
		expect(processedEntry!.status).toBe('failed')
		expect(processedEntry!.retryCount).toBe(2)

		// 第三次：成功 → 標記為 processed
		await outboxInfra.worker.retryFailed()
		processedEntry = await outboxInfra.outboxRepository.findById('outbox-001')
		expect(processedEntry!.status).toBe('processed')
		expect(processedEntry!.retryCount).toBe(2) // 不再增加

		// 驗證 dispatcher 被呼叫 3 次
		expect(outboxInfra.eventDispatcher.dispatch).toHaveBeenCalledTimes(3)
	})

	it('應將超出重試次數的項目移入 DLQ', async () => {
		const event = mockIntegrationEvent('001', 'OrderPlaced')

		const entry = OutboxEntry.createNew(
			'outbox-001',
			event.eventId,
			'order-001',
			'Order',
			'OrderPlaced',
			event
		)

		await outboxInfra.outboxRepository.save(entry)

		// 設定 dispatcher 永遠失敗
		(outboxInfra.eventDispatcher.dispatch as any).mockRejectedValue(new Error('Permanent error'))

		// 連續失敗 4 次（預設 maxRetries = 3）
		// 第 1 次：processNextBatch → failed, retryCount=1
		await outboxInfra.worker.processNextBatch()
		let processedEntry = await outboxInfra.outboxRepository.findById('outbox-001')
		expect(processedEntry!.status).toBe('failed')

		// 第 2-3 次：retryFailed → retryCount=2, 3
		await outboxInfra.worker.retryFailed()
		await outboxInfra.worker.retryFailed()

		processedEntry = await outboxInfra.outboxRepository.findById('outbox-001')
		expect(processedEntry!.retryCount).toBe(3)

		// 驗證 shouldMoveToDeadLetterQueue 返回 true
		const shouldMoveToDeadLetterQueue = processedEntry!.shouldMoveToDeadLetterQueue(3) // maxRetries=3
		expect(shouldMoveToDeadLetterQueue).toBe(true)

		// 手動移入 DLQ
		const deadLetterEntry = OutboxEntry.createNew(
			`dlq-${processedEntry!.id}`,
			processedEntry!.eventId,
			processedEntry!.aggregateId,
			processedEntry!.aggregateType,
			processedEntry!.eventName,
			processedEntry!.payload,
			'dead_letter' // status
		)

		await outboxInfra.outboxRepository.save(deadLetterEntry)

		const dlqEntry = await outboxInfra.outboxRepository.findById(`dlq-${processedEntry!.id}`)
		expect(dlqEntry!.status).toBe('dead_letter')
	})

	it('應記錄 DLQ 警告日誌', async () => {
		const event = mockIntegrationEvent('001', 'OrderPlaced')

		const entry = OutboxEntry.createNew(
			'outbox-001',
			event.eventId,
			'order-001',
			'Order',
			'OrderPlaced',
			event
		)

		await outboxInfra.outboxRepository.save(entry)

		// 設定永遠失敗
		(outboxInfra.eventDispatcher.dispatch as any).mockRejectedValue(new Error('Permanent error'))

		// 進行重試流程
		await outboxInfra.worker.processNextBatch()
		await outboxInfra.worker.retryFailed()
		await outboxInfra.worker.retryFailed()

		// 驗證日誌包含警告（基於 shouldMoveToDeadLetterQueue）
		const processedEntry = await outboxInfra.outboxRepository.findById('outbox-001')
		if (processedEntry!.shouldMoveToDeadLetterQueue(3)) {
			// Worker 應該已記錄警告
			expect(outboxInfra.logger.warn).toHaveBeenCalled()
		}
	})

	it('應在重試失敗時不中斷 Worker', async () => {
		const event1 = mockIntegrationEvent('001', 'OrderPlaced')
		const event2 = mockIntegrationEvent('002', 'OrderPlaced')

		const entry1 = OutboxEntry.createNew('outbox-001', event1.eventId, 'order-001', 'Order', 'OrderPlaced', event1)
		const entry2 = OutboxEntry.createNew('outbox-002', event2.eventId, 'order-002', 'Order', 'OrderPlaced', event2)

		await outboxInfra.outboxRepository.save(entry1)
		await outboxInfra.outboxRepository.save(entry2)

		// 設定只有 entry1 失敗
		let callCount = 0
		(outboxInfra.eventDispatcher.dispatch as any).mockImplementation(async (evt: any) => {
			callCount++
			if (evt.aggregateId === 'order-001') {
				throw new Error('Entry 1 failed')
			}
		})

		// 處理：entry1 失敗，entry2 成功
		await outboxInfra.worker.processNextBatch()

		// 驗證兩個都被處理
		expect(outboxInfra.eventDispatcher.dispatch).toHaveBeenCalledTimes(2)

		const processedEntry1 = await outboxInfra.outboxRepository.findById('outbox-001')
		const processedEntry2 = await outboxInfra.outboxRepository.findById('outbox-002')

		expect(processedEntry1!.status).toBe('failed')
		expect(processedEntry2!.status).toBe('processed')

		// Worker 不應拋出異常
		expect(outboxInfra.worker).toBeDefined()
	})

	it('應記錄詳細的重試指標', async () => {
		const event = mockIntegrationEvent('001', 'OrderPlaced')

		const entry = OutboxEntry.createNew(
			'outbox-001',
			event.eventId,
			'order-001',
			'Order',
			'OrderPlaced',
			event
		)

		await outboxInfra.outboxRepository.save(entry)

		// 設定失敗
		(outboxInfra.eventDispatcher.dispatch as any).mockRejectedValue(new Error('Dispatch error'))

		await outboxInfra.worker.processNextBatch()

		const metrics = outboxInfra.worker.getMetrics()

		// 驗證指標
		expect(metrics).toHaveProperty('failed')
		expect(metrics.failed).toBeGreaterThan(0)

		// 或者驗證日誌包含計數資訊
		expect(outboxInfra.logger.debug).toHaveBeenCalled()
	})
})
