/**
 * @file DatabaseEventDeduplicator.test.ts
 * @description 數據庫事件去重測試
 *
 * 驗證 DatabaseEventDeduplicator 的功能：
 * - 數據庫持久化
 * - TTL 管理
 * - 統計追蹤
 * - 清理機制
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { DatabaseEventDeduplicator } from '@/Foundation/Infrastructure/Services/DatabaseEventDeduplicator'
import { MemoryDatabaseAccess } from '@/Foundation/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { v4 as uuidv4 } from 'uuid'

describe('Database Event Deduplicator', () => {
	let db: MemoryDatabaseAccess
	let dedup: DatabaseEventDeduplicator

	beforeEach(() => {
		db = new MemoryDatabaseAccess()
		dedup = new DatabaseEventDeduplicator(db, 86400) // 24 小時 TTL
	})

	describe('Mark and Check Processed', () => {
		it('應該標記事件為已處理', async () => {
			const eventId = uuidv4()

			await dedup.markProcessed(eventId)
			const isProcessed = await dedup.isProcessed(eventId)

			expect(isProcessed).toBe(true)
		})

		it('應該檢查未處理的事件', async () => {
			const eventId = uuidv4()
			const isProcessed = await dedup.isProcessed(eventId)

			expect(isProcessed).toBe(false)
		})

		it('應該使用元數據標記事件', async () => {
			const eventId = uuidv4()
			const metadata = { source: 'api', userId: '123' }

			await dedup.markProcessed(eventId, metadata)
			const isProcessed = await dedup.isProcessed(eventId)

			expect(isProcessed).toBe(true)
		})

		it('應該處理重複標記（唯一約束）', async () => {
			const eventId = uuidv4()

			// 標記一次
			await dedup.markProcessed(eventId)

			// 再標記一次（應優雅處理唯一約束衝突）
			await dedup.markProcessed(eventId)

			expect(await dedup.isProcessed(eventId)).toBe(true)
		})

		it('應該處理多個事件', async () => {
			const eventIds = [uuidv4(), uuidv4(), uuidv4()]

			for (const id of eventIds) {
				await dedup.markProcessed(id)
			}

			for (const id of eventIds) {
				expect(await dedup.isProcessed(id)).toBe(true)
			}
		})
	})

	describe('Remove Event', () => {
		it('應該移除已處理的事件記錄', async () => {
			const eventId = uuidv4()

			await dedup.markProcessed(eventId)
			expect(await dedup.isProcessed(eventId)).toBe(true)

			const removed = await dedup.remove(eventId)
			expect(removed).toBe(true)
			expect(await dedup.isProcessed(eventId)).toBe(false)
		})

		it('應該在移除不存在的事件時返回 false', async () => {
			const eventId = uuidv4()
			const removed = await dedup.remove(eventId)

			expect(removed).toBe(false)
		})
	})

	describe('Clear All Records', () => {
		it('應該清空所有已處理事件列表', async () => {
			const eventIds = [uuidv4(), uuidv4(), uuidv4()]

			for (const id of eventIds) {
				await dedup.markProcessed(id)
			}

			await dedup.clear()

			const count = await dedup.getProcessedCount()
			expect(count).toBe(0)
		})
	})

	describe('Get Processed Count', () => {
		it('應該返回已處理事件的數量', async () => {
			const eventIds = [uuidv4(), uuidv4(), uuidv4()]

			let count = await dedup.getProcessedCount()
			expect(count).toBe(0)

			for (const id of eventIds) {
				await dedup.markProcessed(id)
				count = await dedup.getProcessedCount()
				expect(count).toBe(eventIds.indexOf(id) + 1)
			}
		})
	})

	describe('List Processed Events', () => {
		it('應該列出已處理的事件 ID', async () => {
			const eventIds = [uuidv4(), uuidv4(), uuidv4()]

			for (const id of eventIds) {
				await dedup.markProcessed(id)
			}

			const list = await dedup.listProcessedEventIds()
			expect(list.length).toBe(3)
			expect(list).toEqual(eventIds.reverse()) // 應按倒序返回
		})

		it('應該支持限制結果數量', async () => {
			const eventIds = Array.from({ length: 10 }, () => uuidv4())

			for (const id of eventIds) {
				await dedup.markProcessed(id)
			}

			const list = await dedup.listProcessedEventIds(5)
			expect(list.length).toBe(5)
		})
	})

	describe('Cleanup Expired Records', () => {
		it('應該清理過期的事件記錄', async () => {
			// 建立短 TTL 去重器（1 秒）
			const shortTtlDedup = new DatabaseEventDeduplicator(db, 1)

			const eventId1 = uuidv4()
			const eventId2 = uuidv4()

			// 標記兩個事件
			await shortTtlDedup.markProcessed(eventId1)
			await shortTtlDedup.markProcessed(eventId2)

			expect(await shortTtlDedup.getProcessedCount()).toBe(2)

			// 等待過期
			await new Promise((resolve) => setTimeout(resolve, 1500))

			// 清理過期記錄
			const cleaned = await shortTtlDedup.cleanupExpiredRecords()
			expect(cleaned).toBe(2)

			// 驗證已清理
			expect(await shortTtlDedup.getProcessedCount()).toBe(0)
		})

		it('應該只清理已過期的記錄', async () => {
			const shortTtlDedup = new DatabaseEventDeduplicator(db, 2) // 2 秒

			const eventId1 = uuidv4()
			const eventId2 = uuidv4()

			await shortTtlDedup.markProcessed(eventId1)

			// 等待 1 秒
			await new Promise((resolve) => setTimeout(resolve, 1000))

			// 標記第二個事件（1 秒後）
			await shortTtlDedup.markProcessed(eventId2)

			// 再等待 1.5 秒（第一個已過期，第二個未過期）
			await new Promise((resolve) => setTimeout(resolve, 1500))

			const cleaned = await shortTtlDedup.cleanupExpiredRecords()
			expect(cleaned).toBe(1) // 只清理第一個

			// 驗證
			expect(await shortTtlDedup.isProcessed(eventId1)).toBe(false)
			expect(await shortTtlDedup.isProcessed(eventId2)).toBe(true)
		})
	})

	describe('Get Statistics', () => {
		it('應該返回完整的統計資訊', async () => {
			const eventIds = [uuidv4(), uuidv4(), uuidv4()]

			for (const id of eventIds) {
				await dedup.markProcessed(id)
			}

			const stats = await dedup.getStats()

			expect(stats.total).toBe(3)
			expect(stats.active).toBe(3)
			expect(stats.expired).toBe(0)
			expect(stats.oldestRecord).toBeDefined()
		})

		it('應該追蹤已過期和活躍記錄', async () => {
			const shortTtlDedup = new DatabaseEventDeduplicator(db, 1)

			const eventId1 = uuidv4()
			const eventId2 = uuidv4()

			await shortTtlDedup.markProcessed(eventId1)
			await new Promise((resolve) => setTimeout(resolve, 1200))
			await shortTtlDedup.markProcessed(eventId2)

			const stats = await shortTtlDedup.getStats()

			expect(stats.total).toBe(2)
			expect(stats.active).toBe(1)
			expect(stats.expired).toBe(1)
		})
	})

	describe('Database Failure Handling', () => {
		it('應該在數據庫失敗時優雅降級', async () => {
			const failingDb: any = {
				table: () => {
					throw new Error('Database connection failed')
				},
			}

			const failingDedup = new DatabaseEventDeduplicator(failingDb)

			// isProcessed 應返回 false（傾向重複執行）
			const isProcessed = await failingDedup.isProcessed(uuidv4())
			expect(isProcessed).toBe(false)

			// markProcessed 應拋出異常
			try {
				await failingDedup.markProcessed(uuidv4())
				expect.unreachable()
			} catch (error) {
				expect(String(error)).toContain('Failed to mark event')
			}

			// getProcessedCount 應返回 0
			const count = await failingDedup.getProcessedCount()
			expect(count).toBe(0)
		})
	})

	describe('Performance', () => {
		it('應該支持大量事件', async () => {
			const eventCount = 100
			const eventIds = Array.from({ length: eventCount }, () => uuidv4())

			for (const id of eventIds) {
				await dedup.markProcessed(id)
			}

			const count = await dedup.getProcessedCount()
			expect(count).toBe(eventCount)

			// 隨機驗證存在性
			for (let i = 0; i < 10; i++) {
				const randomId = eventIds[Math.floor(Math.random() * eventCount)]!
				expect(await dedup.isProcessed(randomId)).toBe(true)
			}
		})
	})

	describe('Idempotency', () => {
		it('應該支持冪等的標記操作', async () => {
			const eventId = uuidv4()

			// 多次標記應安全
			await dedup.markProcessed(eventId)
			await dedup.markProcessed(eventId)
			await dedup.markProcessed(eventId)

			expect(await dedup.isProcessed(eventId)).toBe(true)
		})

		it('應該支持重複的查詢檢查', async () => {
			const eventId = uuidv4()

			await dedup.markProcessed(eventId)

			// 多次查詢應返回相同結果
			const result1 = await dedup.isProcessed(eventId)
			const result2 = await dedup.isProcessed(eventId)
			const result3 = await dedup.isProcessed(eventId)

			expect(result1).toBe(true)
			expect(result2).toBe(true)
			expect(result3).toBe(true)
		})
	})
})
