/**
 * @file MemoryOutboxRepository.test.ts
 * @description MemoryOutboxRepository 集成測試
 *
 * 測試項目：
 * - 基本 CRUD：save()、findById()、delete()
 * - 查詢操作：findUnprocessed()、findFailed()、findByDeadLetterQueue()
 * - 統計方法：countUnprocessed()、countFailed()、getStats()
 * - 樂觀鎖：版本衝突檢測
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryOutboxRepository } from '@/Foundation/Infrastructure/Repositories/MemoryOutboxRepository'
import { OutboxEntry } from '@/Foundation/Domain/Aggregates/OutboxEntry'
import { OptimisticLockException } from '@/Foundation/Application/OptimisticLockException'
import type { IntegrationEvent } from '@/Foundation/Domain/IntegrationEvent'

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

describe('MemoryOutboxRepository', () => {
	let repository: MemoryOutboxRepository
	let entry: OutboxEntry

	beforeEach(async () => {
		repository = new MemoryOutboxRepository()
		entry = OutboxEntry.createNew(
			'outbox-001',
			'evt-123',
			'order-456',
			'Order',
			'OrderPlaced',
			mockIntegrationEvent
		)
	})

	describe('基本 CRUD：save() 與 findById()', () => {
		it('應保存新項目', async () => {
			await repository.save(entry)

			const found = await repository.findById('outbox-001')
			expect(found).not.toBe(null)
			expect(found?.eventId).toBe('evt-123')
		})

		it('應更新現有項目', async () => {
			await repository.save(entry)

			const processed = entry.markAsProcessed()
			await repository.save(processed)

			const found = await repository.findById('outbox-001')
			expect(found?.isProcessed()).toBe(true)
		})

		it('findById 應返回 null 若項目不存在', async () => {
			const found = await repository.findById('non-existent')

			expect(found).toBe(null)
		})

		it('應刪除項目', async () => {
			await repository.save(entry)
			await repository.delete('outbox-001')

			const found = await repository.findById('outbox-001')
			expect(found).toBe(null)
		})
	})

	describe('樂觀鎖：version 衝突偵測', () => {
		it('應在版本不匹配時拋出 OptimisticLockException', async () => {
			await repository.save(entry)

			const processed = entry.markAsProcessed()
			const reprocessed = processed.markAsProcessed()

			// reprocessed 版本為 2，但 entry 版本為 0
			// 當嘗試直接保存 reprocessed（跳過 processed）應失敗
			// 實際上在我們的實現中，版本是遞增的，只需檢查版本 - 1
			const versionMismatch = new OutboxEntry(
				'outbox-001',
				'evt-123',
				'order-456',
				'Order',
				'OrderPlaced',
				mockIntegrationEvent,
				new Date(),
				null,
				'pending',
				0,
				null,
				999 // 錯誤的版本
			)

			await expect(repository.save(versionMismatch)).rejects.toThrow(OptimisticLockException)
		})
	})

	describe('查詢操作：findUnprocessed()', () => {
		it('應返回所有 pending 項目', async () => {
			const entry1 = OutboxEntry.createNew('out-1', 'evt-1', 'agg-1', 'Type', 'Event1', mockIntegrationEvent)
			const entry2 = OutboxEntry.createNew('out-2', 'evt-2', 'agg-2', 'Type', 'Event2', mockIntegrationEvent)
			const entry3 = entry.markAsProcessed()

			await repository.save(entry1)
			await repository.save(entry2)
			await repository.save(entry3)

			const unprocessed = await repository.findUnprocessed()

			expect(unprocessed).toHaveLength(2)
			expect(unprocessed.map((e) => e.id)).toContain('out-1')
			expect(unprocessed.map((e) => e.id)).toContain('out-2')
		})

		it('應支援 limit 和 offset', async () => {
			for (let i = 0; i < 5; i++) {
				const e = OutboxEntry.createNew(
					`out-${i}`,
					`evt-${i}`,
					`agg-${i}`,
					'Type',
					'Event',
					mockIntegrationEvent
				)
				await repository.save(e)
			}

			const first2 = await repository.findUnprocessed(2, 0)
			expect(first2).toHaveLength(2)

			const next2 = await repository.findUnprocessed(2, 2)
			expect(next2).toHaveLength(2)
			expect(first2[0].id).not.toBe(next2[0].id)
		})
	})

	describe('查詢操作：findFailed()', () => {
		it('應返回所有 failed 項目', async () => {
			const failed1 = entry.markAsFailed('Error 1')
			const failed2 = OutboxEntry.createNew(
				'out-2',
				'evt-2',
				'agg-2',
				'Type',
				'Event2',
				mockIntegrationEvent
			).markAsFailed('Error 2')

			await repository.save(failed1)
			await repository.save(failed2)

			const failed = await repository.findFailed()

			expect(failed).toHaveLength(2)
		})

		it('應按 retryCount 升序排序', async () => {
			const e1 = entry.markAsFailed('E1').markAsFailed('E1')
			const e2 = OutboxEntry.createNew('out-2', 'evt-2', 'agg-2', 'Type', 'Event2', mockIntegrationEvent)
				.markAsFailed('E2')

			await repository.save(e1)
			await repository.save(e2)

			const failed = await repository.findFailed()

			expect(failed[0].retryCount).toBeLessThanOrEqual(failed[1].retryCount)
		})
	})

	describe('查詢操作：findByDeadLetterQueue()', () => {
		it('應返回超過 maxRetries 的項目', async () => {
			let current = entry
			for (let i = 0; i < 4; i++) {
				current = current.markAsFailed('Error')
			}

			await repository.save(current)

			const dlq = await repository.findByDeadLetterQueue(3)

			expect(dlq).toHaveLength(1)
			expect(dlq[0].id).toBe('outbox-001')
		})
	})

	describe('統計方法', () => {
		it('countUnprocessed 應返回正確計數', async () => {
			const e1 = entry
			const e2 = OutboxEntry.createNew('out-2', 'evt-2', 'agg-2', 'Type', 'Event2', mockIntegrationEvent)
			const e3 = OutboxEntry.createNew('out-3', 'evt-3', 'agg-3', 'Type', 'Event3', mockIntegrationEvent)
				.markAsProcessed()

			await repository.save(e1)
			await repository.save(e2)
			await repository.save(e3)

			const count = await repository.countUnprocessed()

			expect(count).toBe(2)
		})

		it('countFailed 應返回正確計數', async () => {
			const e1 = entry.markAsFailed('Error')
			const e2 = OutboxEntry.createNew('out-2', 'evt-2', 'agg-2', 'Type', 'Event2', mockIntegrationEvent)
				.markAsFailed('Error')

			await repository.save(e1)
			await repository.save(e2)

			const count = await repository.countFailed()

			expect(count).toBe(2)
		})

		it('getStats 應返回完整統計', async () => {
			const e1 = entry
			const e2 = OutboxEntry.createNew('out-2', 'evt-2', 'agg-2', 'Type', 'Event2', mockIntegrationEvent)
				.markAsProcessed()
			const e3 = OutboxEntry.createNew('out-3', 'evt-3', 'agg-3', 'Type', 'Event3', mockIntegrationEvent)
				.markAsFailed('Error')

			await repository.save(e1)
			await repository.save(e2)
			await repository.save(e3)

			const stats = await repository.getStats()

			expect(stats.pending).toBe(1)
			expect(stats.processed).toBe(1)
			expect(stats.failed).toBe(1)
			expect(stats.oldestPendingAt).not.toBe(null)
		})
	})

	describe('清理操作：deleteProcessed()', () => {
		it('應刪除指定日期前已處理的項目', async () => {
			const e1 = entry.markAsProcessed()
			const e2 = OutboxEntry.createNew('out-2', 'evt-2', 'agg-2', 'Type', 'Event2', mockIntegrationEvent)
				.markAsProcessed()

			await repository.save(e1)
			await repository.save(e2)

			const deleted = await repository.deleteProcessed(new Date())

			expect(deleted).toBeGreaterThan(0)
			expect(await repository.countUnprocessed()).toBe(0)
		})
	})

	describe('防重檢查', () => {
		it('應追蹤已處理的事件 ID', async () => {
			const processed = entry.markAsProcessed()
			await repository.save(processed)

			const isProcessed = await repository.isEventProcessed('evt-123')

			expect(isProcessed).toBe(true)
		})

		it('未處理的事件 ID 應返回 false', async () => {
			await repository.save(entry)

			const isProcessed = await repository.isEventProcessed('evt-123')

			expect(isProcessed).toBe(false)
		})
	})

	describe('測試輔助方法', () => {
		it('clear 應清空所有數據', async () => {
			await repository.save(entry)
			await repository.clear()

			const count = await repository.countUnprocessed()

			expect(count).toBe(0)
		})

		it('getAllEntries 應返回所有項目', async () => {
			const e1 = entry
			const e2 = OutboxEntry.createNew('out-2', 'evt-2', 'agg-2', 'Type', 'Event2', mockIntegrationEvent)

			await repository.save(e1)
			await repository.save(e2)

			const all = await repository.getAllEntries()

			expect(all).toHaveLength(2)
		})
	})
})
