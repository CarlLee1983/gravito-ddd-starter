/**
 * @file AuditHandlers.test.ts
 * @description AuditLog Handler 整合測試（8 個）
 *
 * 測試項目：
 * 1. OrderPlacedAuditHandler - 事件監聽與持久化
 * 2. PaymentSucceededAuditHandler - 事件監聽與持久化
 * 3. PaymentFailedAuditHandler - 事件監聽與 ERROR 嚴重性
 * 4. OrderCancelledAuditHandler - 事件監聽與 WARNING 嚴重性
 * 5. InventoryDeductedAuditHandler - 事件監聯與持久化
 * 6. Handler 錯誤傳播 - Repository 失敗時 throw
 * 7. 多 Handler 同時處理 - 同一 Repository 多條記錄
 * 8. Handler 日誌記錄 - 驗證 logger 呼叫
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OrderPlacedAuditHandler } from '../Application/Handlers/OrderPlacedAuditHandler'
import { PaymentSucceededAuditHandler } from '../Application/Handlers/PaymentSucceededAuditHandler'
import { PaymentFailedAuditHandler } from '../Application/Handlers/PaymentFailedAuditHandler'
import { OrderCancelledAuditHandler } from '../Application/Handlers/OrderCancelledAuditHandler'
import { InventoryDeductedAuditHandler } from '../Application/Handlers/InventoryDeductedAuditHandler'
import { MemoryAuditEntryRepository } from '../Infrastructure/Repositories/MemoryAuditEntryRepository'
import { AuditAction } from '../Domain/ValueObjects/AuditAction'
import { AuditSeverity } from '../Domain/ValueObjects/AuditSeverity'
import { OrderPlaced } from '@/Modules/Order/Domain/Events/OrderPlaced'
import { OrderCancelled } from '@/Modules/Order/Domain/Events/OrderCancelled'
import { PaymentSucceeded } from '@/Modules/Payment/Domain/Events/PaymentSucceeded'
import { PaymentFailed } from '@/Modules/Payment/Domain/Events/PaymentFailed'
import { InventoryDeducted } from '@/Modules/Inventory/Domain/Events/InventoryDeducted'
import { OrderId } from '@/Modules/Order/Domain/ValueObjects/OrderId'
import { Money } from '@/Modules/Order/Domain/ValueObjects/Money'
import { OrderTotal } from '@/Modules/Order/Domain/ValueObjects/OrderTotal'
import { PaymentId } from '@/Modules/Payment/Domain/ValueObjects/PaymentId'
import { TransactionId } from '@/Modules/Payment/Domain/ValueObjects/TransactionId'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'

const createMockLogger = (): ILogger => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
})

describe('AuditLog Handler 整合測試', () => {
	let repository: MemoryAuditEntryRepository
	let logger: ILogger

	beforeEach(() => {
		repository = new MemoryAuditEntryRepository()
		logger = createMockLogger()
	})

	it('OrderPlacedAuditHandler 應建立 INFO 審計條目', async () => {
		const handler = new OrderPlacedAuditHandler(repository, logger)

		const orderId = OrderId.create('order-001')
		const subtotal = Money.create(99.99, 'USD')
		const orderTotal = OrderTotal.create(subtotal, 0)
		const event = new OrderPlaced(orderId, 'user-001', orderTotal)

		await handler.handle(event)

		const entries = repository.getAll()
		expect(entries).toHaveLength(1)
		expect(entries[0].entityType).toBe('Order')
		expect(entries[0].entityId).toBe('order-001')
		expect(entries[0].action).toBe(AuditAction.OrderCreated)
		expect(entries[0].severity).toBe(AuditSeverity.INFO)
		expect(entries[0].userId).toBe('user-001')
	})

	it('PaymentSucceededAuditHandler 應建立 INFO 審計條目', async () => {
		const handler = new PaymentSucceededAuditHandler(repository, logger)

		const paymentId = new PaymentId('payment-001')
		const transactionId = new TransactionId('txn-001')
		const event = new PaymentSucceeded(paymentId, 'order-001', transactionId)

		await handler.handle(event)

		const entries = repository.getAll()
		expect(entries).toHaveLength(1)
		expect(entries[0].entityType).toBe('Payment')
		expect(entries[0].action).toBe(AuditAction.PaymentSucceeded)
		expect(entries[0].severity).toBe(AuditSeverity.INFO)
		expect(entries[0].description).toContain('order-001')
		expect(entries[0].description).toContain('txn-001')
	})

	it('PaymentFailedAuditHandler 應建立 ERROR 審計條目', async () => {
		const handler = new PaymentFailedAuditHandler(repository, logger)

		const paymentId = new PaymentId('payment-002')
		const event = new PaymentFailed(paymentId, 'order-002', 'Insufficient funds')

		await handler.handle(event)

		const entries = repository.getAll()
		expect(entries).toHaveLength(1)
		expect(entries[0].action).toBe(AuditAction.PaymentFailed)
		expect(entries[0].severity).toBe(AuditSeverity.ERROR)
		expect(entries[0].description).toContain('Insufficient funds')
	})

	it('OrderCancelledAuditHandler 應建立 WARNING 審計條目', async () => {
		const handler = new OrderCancelledAuditHandler(repository, logger)

		const orderId = OrderId.create('order-003')
		const event = new OrderCancelled(orderId, 'Customer request')

		await handler.handle(event)

		const entries = repository.getAll()
		expect(entries).toHaveLength(1)
		expect(entries[0].entityType).toBe('Order')
		expect(entries[0].action).toBe(AuditAction.OrderCancelled)
		expect(entries[0].severity).toBe(AuditSeverity.WARNING)
		expect(entries[0].description).toContain('Customer request')
	})

	it('InventoryDeductedAuditHandler 應建立 INFO 審計條目', async () => {
		const handler = new InventoryDeductedAuditHandler(repository, logger)

		const event = InventoryDeducted.create('inv-001', 'SKU-100', 5, 'order-004')

		await handler.handle(event)

		const entries = repository.getAll()
		expect(entries).toHaveLength(1)
		expect(entries[0].entityType).toBe('Inventory')
		expect(entries[0].action).toBe(AuditAction.InventoryDeducted)
		expect(entries[0].severity).toBe(AuditSeverity.INFO)
		expect(entries[0].description).toContain('SKU-100')
		expect(entries[0].description).toContain('5')
	})

	it('Handler 應在 Repository 失敗時拋出錯誤', async () => {
		const failingRepo = {
			save: vi.fn().mockRejectedValue(new Error('DB connection lost')),
			findByEntityId: vi.fn(),
			findBySeverity: vi.fn(),
			exportRange: vi.fn(),
		}

		const handler = new OrderPlacedAuditHandler(failingRepo, logger)

		const orderId = OrderId.create('order-fail')
		const subtotal = Money.create(10, 'USD')
		const orderTotal = OrderTotal.create(subtotal, 0)
		const event = new OrderPlaced(orderId, 'user-fail', orderTotal)

		await expect(handler.handle(event)).rejects.toThrow('DB connection lost')
		expect(logger.error).toHaveBeenCalled()
	})

	it('多個 Handler 可同時寫入同一 Repository', async () => {
		const orderHandler = new OrderPlacedAuditHandler(repository, logger)
		const paymentHandler = new PaymentSucceededAuditHandler(repository, logger)

		const orderId = OrderId.create('order-multi')
		const subtotal = Money.create(50, 'USD')
		const orderTotal = OrderTotal.create(subtotal, 0)
		const orderEvent = new OrderPlaced(orderId, 'user-multi', orderTotal)

		const paymentId = new PaymentId('payment-multi')
		const transactionId = new TransactionId('txn-multi')
		const paymentEvent = new PaymentSucceeded(paymentId, 'order-multi', transactionId)

		await orderHandler.handle(orderEvent)
		await paymentHandler.handle(paymentEvent)

		const entries = repository.getAll()
		expect(entries).toHaveLength(2)
	})

	it('Handler 應正確記錄日誌', async () => {
		const handler = new OrderPlacedAuditHandler(repository, logger)

		const orderId = OrderId.create('order-log')
		const subtotal = Money.create(100, 'USD')
		const orderTotal = OrderTotal.create(subtotal, 0)
		const event = new OrderPlaced(orderId, 'user-log', orderTotal)

		await handler.handle(event)

		expect(logger.info).toHaveBeenCalledWith(
			expect.stringContaining('OrderPlaced')
		)
		expect(logger.debug).toHaveBeenCalledWith(
			expect.stringContaining('audit saved')
		)
	})
})
