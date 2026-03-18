/**
 * @file E2E-Checkout-Notification.test.ts
 * @description 端到端整合測試：訂單建立 → 庫存預留 → 通知發送
 *
 * 測試完整的業務流程：
 * 1. 建立訂單（OrderPlaced 事件）
 * 2. 儲存至 Outbox（OutboxEntry）
 * 3. 分派 IntegrationEvent（EventDispatcher）
 * 4. Handler 接收並推 Job（IJobQueue）
 * 5. Job 被正確序列化（JobPayload）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OutboxEntry } from '@/Foundation/Domain/Aggregates/OutboxEntry'
import { OrderId } from '@/Modules/Order/Domain/ValueObjects/OrderId'
import { Money } from '@/Modules/Order/Domain/ValueObjects/Money'
import { OrderTotal } from '@/Modules/Order/Domain/ValueObjects/OrderTotal'
import { SendOrderConfirmEmailHandler } from '@/Modules/Notification/Application/Handlers/SendOrderConfirmEmailHandler'
import {
	setupOutboxInfrastructure,
	createMockJobQueue,
	createMockLogger,
	createMockTranslator,
	mockIntegrationEvent,
} from '../helpers/IntegrationTestSetup'

describe('IT-1：端到端 Happy Path 整合測試', () => {
	let orderInfra: Awaited<ReturnType<typeof setupOutboxInfrastructure>>
	let jobQueue: ReturnType<typeof createMockJobQueue>
	let logger: ReturnType<typeof createMockLogger>
	let translator: ReturnType<typeof createMockTranslator>

	beforeEach(async () => {
		orderInfra = await setupOutboxInfrastructure()
		jobQueue = createMockJobQueue()
		logger = createMockLogger()
		translator = createMockTranslator()
	})

	it('應完成訂單建立到通知發送的端到端流程', async () => {
		// Step 1: 建立模擬的 OrderPlaced 事件
		const orderId = 'order-001'
		const orderPlacedEvent = mockIntegrationEvent('001', 'OrderPlaced')

		// Step 2: 建立 OutboxEntry（模擬 BaseEventSourcedRepository.save() 的行為）
		const outboxEntry = OutboxEntry.createNew(
			`outbox-${orderId}`,
			orderPlacedEvent.eventId,
			orderId,
			'Order',
			'OrderPlaced',
			orderPlacedEvent
		)

		await orderInfra.outboxRepository.save(outboxEntry)

		// Step 3: 驗證 OutboxEntry 被儲存
		const savedEntry = await orderInfra.outboxRepository.findById(outboxEntry.id)
		expect(savedEntry).toBeDefined()
		expect(savedEntry!.status).toBe('pending')

		// Step 4: 模擬 SequentialOutboxWorker 分派事件
		await orderInfra.worker.processNextBatch()

		// Step 5: 驗證 EventDispatcher.dispatch 被呼叫
		expect(orderInfra.eventDispatcher.dispatch).toHaveBeenCalled()
		const dispatchedEvent = (orderInfra.eventDispatcher.dispatch as any).mock.calls[0][0]
		expect(dispatchedEvent.eventName).toBe('OrderPlaced')

		// Step 6: 模擬 Handler 接收事件並推 Job
		const handler = new SendOrderConfirmEmailHandler(jobQueue, logger, translator)
		await handler.handle(dispatchedEvent)

		// Step 7: 驗證 Job 被推入隊列
		expect(jobQueue.push).toHaveBeenCalled()
		const jobCall = (jobQueue.push as any).mock.calls[0]
		expect(jobCall[0]).toBe('notification.send_order_confirm_email')

		// Step 8: 驗證 JobPayload 結構完整
		const jobPayload = jobCall[1]
		expect(jobPayload).toHaveProperty('meta')
		expect(jobPayload).toHaveProperty('data')
		expect(jobPayload).toHaveProperty('attempt')
		expect(jobPayload).toHaveProperty('enqueuedAt')

		// Step 9: 驗證 Job data 包含正確的訂單資訊
		expect(jobPayload.data).toHaveProperty('orderId', 'order-001')
		expect(jobPayload.data).toHaveProperty('email')
		expect(jobPayload.data).toHaveProperty('amount')
		expect(jobPayload.data).toHaveProperty('currency')

		// Step 10: 驗證 OutboxEntry 最終狀態為 processed
		const processedEntry = await orderInfra.outboxRepository.findById(outboxEntry.id)
		expect(processedEntry!.status).toBe('processed')
	})

	it('應正確序列化事件資料到 Job payload', async () => {
		const orderId = 'order-002'
		const orderPlacedEvent = mockIntegrationEvent('002', 'OrderPlaced')

		const outboxEntry = OutboxEntry.createNew(
			`outbox-${orderId}`,
			orderPlacedEvent.eventId,
			orderId,
			'Order',
			'OrderPlaced',
			orderPlacedEvent
		)

		await orderInfra.outboxRepository.save(outboxEntry)
		await orderInfra.worker.processNextBatch()

		const dispatchedEvent = (orderInfra.eventDispatcher.dispatch as any).mock.calls[0][0]
		const handler = new SendOrderConfirmEmailHandler(jobQueue, logger, translator)
		await handler.handle(dispatchedEvent)

		const jobPayload = (jobQueue.push as any).mock.calls[0][1]

		// 驗證 Job data 被正確序列化
		expect(jobPayload.data).toHaveProperty('orderId')
		expect(jobPayload.data).toHaveProperty('email')
	})

	it('應在整個流程中記錄適當的日誌', async () => {
		const orderId = 'order-003'
		const orderPlacedEvent = mockIntegrationEvent('003', 'OrderPlaced')

		const outboxEntry = OutboxEntry.createNew(
			`outbox-${orderId}`,
			orderPlacedEvent.eventId,
			orderId,
			'Order',
			'OrderPlaced',
			orderPlacedEvent
		)

		await orderInfra.outboxRepository.save(outboxEntry)

		// 處理前：OutboxWorker 應記錄掃描日誌
		await orderInfra.worker.processNextBatch()
		expect(orderInfra.logger.debug).toHaveBeenCalled()

		const dispatchedEvent = (orderInfra.eventDispatcher.dispatch as any).mock.calls[0][0]
		const handler = new SendOrderConfirmEmailHandler(jobQueue, logger, translator)
		await handler.handle(dispatchedEvent)

		// Handler 應記錄事件接收日誌
		expect(logger.info).toHaveBeenCalled()
		// Handler 應記錄 Job 分派日誌
		expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('dispatched'))
	})

	it('應支援多個訂單的並行處理', async () => {
		// 同時建立 3 個訂單的 OutboxEntry
		const orderIds = ['order-101', 'order-102', 'order-103']

		for (let i = 0; i < 3; i++) {
			const event = mockIntegrationEvent(`10${i + 1}`, 'OrderPlaced')
			const entry = OutboxEntry.createNew(
				`outbox-${orderIds[i]}`,
				event.eventId,
				orderIds[i],
				'Order',
				'OrderPlaced',
				event
			)
			await orderInfra.outboxRepository.save(entry)
		}

		// 一次性處理所有 pending
		await orderInfra.worker.processNextBatch()

		// 驗證 3 個事件都被分派
		expect(orderInfra.eventDispatcher.dispatch).toHaveBeenCalledTimes(3)

		// 模擬 3 個 Handler 分別處理事件
		const handler = new SendOrderConfirmEmailHandler(jobQueue, logger, translator)
		for (let i = 0; i < 3; i++) {
			const dispatchedEvent = (orderInfra.eventDispatcher.dispatch as any).mock.calls[i][0]
			await handler.handle(dispatchedEvent)
		}

		// 驗證 3 個 Job 都被推入
		expect(jobQueue.push).toHaveBeenCalledTimes(3)

		// 驗證所有訂單的 OutboxEntry 都已 processed
		for (const orderId of orderIds) {
			const entry = await orderInfra.outboxRepository.findById(`outbox-${orderId}`)
			expect(entry!.status).toBe('processed')
		}
	})
})
