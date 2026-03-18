/**
 * @file OutboxEntry.test.ts
 * @description OutboxEntry 聚合根單元測試
 *
 * 測試項目：
 * - 工廠方法：createNew()
 * - 狀態轉移：markAsProcessed()、markAsFailed()、resetForRetry()
 * - 查詢方法：isPending()、isProcessed()、isFailed()、shouldMoveToDeadLetterQueue()
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { OutboxEntry } from '@/Foundation/Domain/Aggregates/OutboxEntry'
import type { IntegrationEvent } from '@/Foundation/Domain/IntegrationEvent'

// 模擬的整合事件
const mockIntegrationEvent: IntegrationEvent = {
	eventId: 'evt-123',
	eventName: 'OrderPlaced',
	aggregateId: 'order-456',
	aggregateType: 'Order',
	occurredAt: new Date(),
	toJSON: () => ({
		eventId: 'evt-123',
		eventName: 'OrderPlaced',
		aggregateId: 'order-456',
		aggregateType: 'Order',
		occurredAt: new Date().toISOString(),
	}),
}

describe('OutboxEntry 聚合根', () => {
	let entry: OutboxEntry

	beforeEach(() => {
		entry = OutboxEntry.createNew(
			'outbox-001',
			'evt-123',
			'order-456',
			'Order',
			'OrderPlaced',
			mockIntegrationEvent
		)
	})

	describe('工廠方法：createNew()', () => {
		it('應建立新的 pending 項目', () => {
			expect(entry.isPending()).toBe(true)
			expect(entry.isProcessed()).toBe(false)
			expect(entry.isFailed()).toBe(false)
			expect(entry.retryCount).toBe(0)
			expect(entry.lastError).toBe(null)
			expect(entry.processedAt).toBe(null)
			expect(entry.version).toBe(0)
		})

		it('應正確設定所有屬性', () => {
			expect(entry.id).toBe('outbox-001')
			expect(entry.eventId).toBe('evt-123')
			expect(entry.aggregateId).toBe('order-456')
			expect(entry.aggregateType).toBe('Order')
			expect(entry.eventType).toBe('OrderPlaced')
			expect(entry.payload).toBe(mockIntegrationEvent)
		})
	})

	describe('狀態轉移：markAsProcessed()', () => {
		it('應將狀態從 pending 改為 processed', () => {
			const processed = entry.markAsProcessed()

			expect(processed.isProcessed()).toBe(true)
			expect(processed.isPending()).toBe(false)
			expect(processed.processedAt).not.toBe(null)
			expect(processed.lastError).toBe(null)
		})

		it('應遞增版本號', () => {
			const processed = entry.markAsProcessed()

			expect(processed.version).toBe(entry.version + 1)
		})

		it('應保持不可變（原實例不變）', () => {
			const processed = entry.markAsProcessed()

			expect(entry.isPending()).toBe(true)
			expect(entry.version).toBe(0)
			expect(processed.isPending()).toBe(false)
		})

		it('已處理項目再呼叫 markAsProcessed 應返回自身', () => {
			const processed = entry.markAsProcessed()
			const reprocessed = processed.markAsProcessed()

			expect(processed).toBe(reprocessed)
		})
	})

	describe('狀態轉移：markAsFailed()', () => {
		it('應將狀態改為 failed', () => {
			const failed = entry.markAsFailed('Network timeout')

			expect(failed.isFailed()).toBe(true)
			expect(failed.isPending()).toBe(false)
			expect(failed.retryCount).toBe(1)
			expect(failed.lastError).toBe('Network timeout')
		})

		it('應遞增重試計數', () => {
			let current = entry
			for (let i = 0; i < 3; i++) {
				current = current.markAsFailed('Error')
				expect(current.retryCount).toBe(i + 1)
			}
		})

		it('應清除前一次的錯誤信息', () => {
			const failed1 = entry.markAsFailed('Error 1')
			const failed2 = failed1.markAsFailed('Error 2')

			expect(failed2.lastError).toBe('Error 2')
		})

		it('已處理項目再呼叫 markAsFailed 應返回自身', () => {
			const processed = entry.markAsProcessed()
			const result = processed.markAsFailed('Error')

			expect(processed).toBe(result)
		})
	})

	describe('狀態轉移：resetForRetry()', () => {
		it('應將 failed 項目重置為 pending', () => {
			const failed = entry.markAsFailed('Error')
			const reset = failed.resetForRetry()

			expect(reset.isPending()).toBe(true)
			expect(reset.lastError).toBe(null)
			expect(reset.retryCount).toBe(1) // retryCount 不變
		})

		it('已處理項目呼叫 resetForRetry 應返回自身', () => {
			const processed = entry.markAsProcessed()
			const result = processed.resetForRetry()

			expect(processed).toBe(result)
		})
	})

	describe('查詢方法：shouldMoveToDeadLetterQueue()', () => {
		it('retryCount <= 3 不應進入 DLQ', () => {
			let current = entry
			for (let i = 0; i < 3; i++) {
				current = current.markAsFailed('Error')
				expect(current.shouldMoveToDeadLetterQueue(3)).toBe(false)
			}
		})

		it('retryCount > 3 應進入 DLQ', () => {
			let current = entry
			for (let i = 0; i < 4; i++) {
				current = current.markAsFailed('Error')
			}

			expect(current.shouldMoveToDeadLetterQueue(3)).toBe(true)
		})

		it('processed 狀態不應進入 DLQ', () => {
			const processed = entry.markAsProcessed()

			expect(processed.shouldMoveToDeadLetterQueue(3)).toBe(false)
		})

		it('支援自訂 maxRetries', () => {
			let current = entry
			for (let i = 0; i < 5; i++) {
				current = current.markAsFailed('Error')
			}

			expect(current.shouldMoveToDeadLetterQueue(5)).toBe(false)
			expect(current.shouldMoveToDeadLetterQueue(4)).toBe(true)
		})
	})

	describe('轉換方法：toJSON()', () => {
		it('應返回包含所有屬性的物件', () => {
			const json = entry.toJSON()

			expect(json.id).toBe('outbox-001')
			expect(json.eventId).toBe('evt-123')
			expect(json.aggregateId).toBe('order-456')
			expect(json.aggregateType).toBe('Order')
			expect(json.eventType).toBe('OrderPlaced')
			expect(json.status).toBe('pending')
			expect(json.retryCount).toBe(0)
			expect(json.lastError).toBe(null)
			expect(json.createdAt).toBeDefined()
			expect(json.processedAt).toBe(null)
		})
	})
})
