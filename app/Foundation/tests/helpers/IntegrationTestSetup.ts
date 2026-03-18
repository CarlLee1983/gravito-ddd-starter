/**
 * @file IntegrationTestSetup.ts
 * @description 整合測試的共用 helper 和基礎設施
 *
 * 提供標準化的 mock factory、Outbox 設置、Inventory 初始化等
 * 所有整合測試應共用此檔案的工具
 */

import { vi } from 'vitest'
import type { IEventDispatcher } from '@/Foundation/Application/Ports/IEventDispatcher'
import type { IJobQueue } from '@/Foundation/Infrastructure/Ports/Messaging/IJobQueue'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import type { IMailer } from '@/Foundation/Infrastructure/Ports/Services/IMailer'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'
import type { IntegrationEvent } from '@/Foundation/Domain/IntegrationEvent'
import { SequentialOutboxWorker } from '@/Foundation/Infrastructure/Services/SequentialOutboxWorker'
import { MemoryOutboxRepository } from '@/Foundation/Infrastructure/Repositories/MemoryOutboxRepository'
import { MemoryInventoryRepository } from '@/Modules/Inventory/Infrastructure/Repositories/MemoryInventoryRepository'
import { InventoryAggregate } from '@/Modules/Inventory/Domain/Aggregates/InventoryAggregate'

/**
 * 建立 mock EventDispatcher
 * - 可追蹤 dispatch() 呼叫
 * - 支援設定失敗場景
 */
export const createMockEventDispatcher = (): IEventDispatcher & {
	dispatch: ReturnType<typeof vi.fn>
} => {
	const dispatchFn = vi.fn(async (event: IntegrationEvent) => {
		// 預設成功
	})

	return {
		subscribe: vi.fn(),
		unsubscribe: vi.fn(),
		dispatch: dispatchFn,
	} as any
}

/**
 * 建立 mock JobQueue
 * - 可追蹤 push() 和 process() 呼叫
 * - 支援設定失敗場景
 */
export const createMockJobQueue = (): IJobQueue & {
	push: ReturnType<typeof vi.fn>
	process: ReturnType<typeof vi.fn>
} => {
	return {
		push: vi.fn(async (jobName: string, payload: any) => {
			// 預設成功
		}),
		process: vi.fn(),
	} as any
}

/**
 * 建立 mock Logger
 * - 靜默處理所有日誌呼叫
 * - 可驗證日誌記錄
 */
export const createMockLogger = (): ILogger => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
})

/**
 * 建立 mock Mailer
 * - 模擬 email 發送
 * - 可追蹤發送呼叫
 */
export const createMockMailer = (): IMailer => ({
	send: vi.fn(async (to: string, subject: string, body: string) => {
		// 預設成功
	}),
})

/**
 * 建立 mock Translator
 * - 返回 key 本身（無實際翻譯）
 * - 可追蹤翻譯呼叫
 */
export const createMockTranslator = (): ITranslator => ({
	trans: vi.fn((key: string, params?: Record<string, any>) => {
		// 返回 key，便於測試驗證
		return key
	}),
	choice: vi.fn((key: string, count: number, params?: Record<string, any>) => {
		return key
	}),
	setLocale: vi.fn(),
	getLocale: vi.fn(() => 'en'),
})

/**
 * Outbox 基礎設施一站式設置
 */
export async function setupOutboxInfrastructure() {
	const outboxRepository = new MemoryOutboxRepository()
	const eventDispatcher = createMockEventDispatcher()
	const logger = createMockLogger()

	const worker = new SequentialOutboxWorker(
		outboxRepository,
		eventDispatcher,
		logger,
		100 // batch size
	)

	return {
		outboxRepository,
		eventDispatcher,
		logger,
		worker,
	}
}

/**
 * Inventory 快速初始化
 * @param productId - 商品 ID（如 'SKU-001'）
 * @param quantity - 初始數量
 * @returns Inventory Repository + 初始化的聚合根
 */
export async function setupInventory(productId: string, quantity: number) {
	const repository = new MemoryInventoryRepository()

	// 建立庫存聚合根
	const inventory = InventoryAggregate.create(productId, quantity)

	// 直接儲存到 repository（側步事件分派，因為 Memory 實現不分派）
	await repository.save(inventory)

	return {
		repository,
		inventory,
	}
}

/**
 * 建立測試用 IntegrationEvent
 * @param id - 事件識別碼
 * @param eventType - 事件類型（OrderPlaced, PaymentSucceeded, PaymentFailed）
 */
export const mockIntegrationEvent = (
	id: string,
	eventType: 'OrderPlaced' | 'PaymentSucceeded' | 'PaymentFailed' = 'OrderPlaced'
): IntegrationEvent => {
	const baseEvent = {
		eventId: `evt-${id}`,
		eventName: eventType,
		occurredAt: new Date(),
	}

	if (eventType === 'OrderPlaced') {
		return {
			...baseEvent,
			aggregateId: `order-${id}`,
			aggregateType: 'Order',
			data: {
				orderId: `order-${id}`,
				userId: `user-${id}`,
				subtotal: 99.99,
				tax: 10.00,
				total: 109.99,
				currency: 'USD',
			},
			toJSON: () => ({
				eventId: `evt-${id}`,
				eventName: eventType,
				aggregateId: `order-${id}`,
				aggregateType: 'Order',
				occurredAt: new Date().toISOString(),
				data: {
					orderId: `order-${id}`,
					userId: `user-${id}`,
					subtotal: 99.99,
					tax: 10.00,
					total: 109.99,
					currency: 'USD',
				},
			}),
		} as IntegrationEvent
	}

	if (eventType === 'PaymentSucceeded') {
		return {
			...baseEvent,
			aggregateId: `payment-${id}`,
			aggregateType: 'Payment',
			data: {
				paymentId: `payment-${id}`,
				orderId: `order-${id}`,
				transactionId: `txn-${id}`,
				amount: 109.99,
				currency: 'USD',
			},
			toJSON: () => ({
				eventId: `evt-${id}`,
				eventName: eventType,
				aggregateId: `payment-${id}`,
				aggregateType: 'Payment',
				occurredAt: new Date().toISOString(),
				data: {
					paymentId: `payment-${id}`,
					orderId: `order-${id}`,
					transactionId: `txn-${id}`,
					amount: 109.99,
					currency: 'USD',
				},
			}),
		} as IntegrationEvent
	}

	// PaymentFailed
	return {
		...baseEvent,
		aggregateId: `payment-${id}`,
		aggregateType: 'Payment',
		data: {
			paymentId: `payment-${id}`,
			orderId: `order-${id}`,
			reason: 'Card declined',
		},
		toJSON: () => ({
			eventId: `evt-${id}`,
			eventName: eventType,
			aggregateId: `payment-${id}`,
			aggregateType: 'Payment',
			occurredAt: new Date().toISOString(),
			data: {
				paymentId: `payment-${id}`,
				orderId: `order-${id}`,
				reason: 'Card declined',
			},
		}),
	} as IntegrationEvent
}

/**
 * 便利函數：設定 EventDispatcher 失敗指定次數
 * @param dispatcher - mock dispatcher
 * @param failCount - 失敗次數
 * @param error - 拋出的錯誤
 */
export function setupDispatcherFailure(
	dispatcher: ReturnType<typeof createMockEventDispatcher>,
	failCount: number = 1,
	error: Error = new Error('Dispatch failed')
) {
	let callCount = 0
	dispatcher.dispatch.mockImplementation(async () => {
		callCount++
		if (callCount <= failCount) {
			throw error
		}
	})
}

/**
 * 便利函數：設定 JobQueue.push 失敗指定次數
 * @param queue - mock queue
 * @param failCount - 失敗次數
 * @param error - 拋出的錯誤
 */
export function setupQueueFailure(
	queue: ReturnType<typeof createMockJobQueue>,
	failCount: number = 1,
	error: Error = new Error('Queue error')
) {
	let callCount = 0
	queue.push.mockImplementation(async () => {
		callCount++
		if (callCount <= failCount) {
			throw error
		}
	})
}
