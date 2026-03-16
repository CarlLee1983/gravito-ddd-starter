/**
 * @file RedisEventDeduplicator.test.ts
 * @description Redis 事件去重測試
 *
 * 驗證 RedisEventDeduplicator 的功能：
 * - 分散式事件去重
 * - TTL 自動清理
 * - 計數和列表
 * - 故障降級
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { RedisEventDeduplicator } from '@/Foundation/Infrastructure/Services/RedisEventDeduplicator'
import type { IRedisService } from '@/Foundation/Infrastructure/Ports/Messaging/IRedisService'
import { v4 as uuidv4 } from 'uuid'

// Mock Redis 服務
class MockRedisService implements IRedisService {
	private store: Map<string, { value: string; expiresAt?: number }> = new Map()

	async ping(): Promise<string> {
		return 'PONG'
	}

	async get(key: string): Promise<string | null> {
		const entry = this.store.get(key)
		if (!entry) return null

		if (entry.expiresAt && entry.expiresAt <= Date.now()) {
			this.store.delete(key)
			return null
		}

		return entry.value
	}

	async set(key: string, value: string, expiresInSeconds?: number): Promise<void> {
		const expiresAt = expiresInSeconds ? Date.now() + expiresInSeconds * 1000 : undefined
		this.store.set(key, { value, expiresAt })
	}

	async del(...keys: string[]): Promise<number> {
		let count = 0
		for (const key of keys) {
			if (this.store.has(key)) {
				this.store.delete(key)
				count++
			}
		}
		return count
	}

	async exists(key: string): Promise<boolean> {
		const entry = this.store.get(key)
		if (!entry) return false

		if (entry.expiresAt && entry.expiresAt <= Date.now()) {
			this.store.delete(key)
			return false
		}

		return true
	}

	async rpush(key: string, value: string): Promise<number> {
		const list = this.store.get(key)
		if (!list) {
			this.store.set(key, { value: JSON.stringify([value]) })
			return 1
		}

		const arr = JSON.parse(list.value) as string[]
		arr.push(value)
		this.store.set(key, { value: JSON.stringify(arr) })
		return arr.length
	}

	async lpop(key: string): Promise<string | null> {
		const list = this.store.get(key)
		if (!list) return null

		const arr = JSON.parse(list.value) as string[]
		const item = arr.shift()
		if (arr.length === 0) {
			this.store.delete(key)
		} else {
			this.store.set(key, { value: JSON.stringify(arr) })
		}

		return item ?? null
	}

	async lrange(key: string, start: number, stop: number): Promise<string[]> {
		const list = this.store.get(key)
		if (!list) return []

		const arr = JSON.parse(list.value) as string[]
		return arr.slice(start, stop === -1 ? undefined : stop + 1)
	}

	async llen(key: string): Promise<number> {
		const list = this.store.get(key)
		if (!list) return 0

		const arr = JSON.parse(list.value) as string[]
		return arr.length
	}

	clear(): void {
		this.store.clear()
	}
}

describe('Redis Event Deduplicator', () => {
	let redis: MockRedisService
	let deduplicator: RedisEventDeduplicator

	beforeEach(() => {
		redis = new MockRedisService()
		deduplicator = new RedisEventDeduplicator(redis)
	})

	afterEach(() => {
		redis.clear()
	})

	describe('Mark and Check Processed', () => {
		it('應該標記事件為已處理', async () => {
			const eventId = uuidv4()

			await deduplicator.markProcessed(eventId)
			const isProcessed = await deduplicator.isProcessed(eventId)

			expect(isProcessed).toBe(true)
		})

		it('應該檢查未處理的事件', async () => {
			const eventId = uuidv4()
			const isProcessed = await deduplicator.isProcessed(eventId)

			expect(isProcessed).toBe(false)
		})

		it('應該處理多個事件', async () => {
			const eventIds = [uuidv4(), uuidv4(), uuidv4()]

			for (const id of eventIds) {
				await deduplicator.markProcessed(id)
			}

			for (const id of eventIds) {
				expect(await deduplicator.isProcessed(id)).toBe(true)
			}
		})
	})

	describe('Remove Event', () => {
		it('應該移除已處理的事件記錄', async () => {
			const eventId = uuidv4()

			await deduplicator.markProcessed(eventId)
			expect(await deduplicator.isProcessed(eventId)).toBe(true)

			const removed = await deduplicator.remove(eventId)
			expect(removed).toBe(true)
			expect(await deduplicator.isProcessed(eventId)).toBe(false)
		})

		it('應該在移除不存在的事件時返回 false', async () => {
			const eventId = uuidv4()
			const removed = await deduplicator.remove(eventId)

			expect(removed).toBe(false)
		})
	})

	describe('Clear All Records', () => {
		it('應該清空所有已處理事件列表', async () => {
			const eventIds = [uuidv4(), uuidv4(), uuidv4()]

			for (const id of eventIds) {
				await deduplicator.markProcessed(id)
			}

			await deduplicator.clear()

			const count = await deduplicator.getProcessedCount()
			expect(count).toBe(0)
		})
	})

	describe('Get Processed Count', () => {
		it('應該返回已處理事件的數量', async () => {
			const eventIds = [uuidv4(), uuidv4(), uuidv4()]

			let count = await deduplicator.getProcessedCount()
			expect(count).toBe(0)

			for (const id of eventIds) {
				await deduplicator.markProcessed(id)
				count = await deduplicator.getProcessedCount()
				expect(count).toBe(eventIds.indexOf(id) + 1)
			}
		})
	})

	describe('List Processed Events', () => {
		it('應該列出已處理的事件 ID', async () => {
			const eventIds = [uuidv4(), uuidv4(), uuidv4()]

			for (const id of eventIds) {
				await deduplicator.markProcessed(id)
			}

			const list = await deduplicator.listProcessedEventIds()
			expect(list.length).toBe(3)
			expect(list).toEqual(eventIds)
		})

		it('應該支持限制結果數量', async () => {
			const eventIds = Array.from({ length: 10 }, () => uuidv4())

			for (const id of eventIds) {
				await deduplicator.markProcessed(id)
			}

			const list = await deduplicator.listProcessedEventIds(5)
			expect(list.length).toBe(5)
		})
	})

	describe('TTL and Expiration', () => {
		it('應該在 TTL 後自動清理事件記錄', async () => {
			const eventId = uuidv4()

			// 建立短 TTL 去重器（1 秒）
			const shortTtlDedup = new RedisEventDeduplicator(redis, 1)

			await shortTtlDedup.markProcessed(eventId)
			expect(await shortTtlDedup.isProcessed(eventId)).toBe(true)

			// 等待過期（需要充足時間，TTL 1 秒 + 緩衝）
			await new Promise((resolve) => setTimeout(resolve, 1500))

			expect(await shortTtlDedup.isProcessed(eventId)).toBe(false)
		})
	})

	describe('Distributed Deduplication', () => {
		it('應該支持多個去重實例共享狀態', async () => {
			const dedup1 = new RedisEventDeduplicator(redis)
			const dedup2 = new RedisEventDeduplicator(redis)

			const eventId = uuidv4()

			// dedup1 標記為已處理
			await dedup1.markProcessed(eventId)

			// dedup2 應能讀取（同一 Redis 後端）
			expect(await dedup2.isProcessed(eventId)).toBe(true)
		})

		it('應該在分散式環境中防止重複執行', async () => {
			const redis1 = new MockRedisService()
			const redis2 = redis1 // 共享 Redis

			const dedup1 = new RedisEventDeduplicator(redis1)
			const dedup2 = new RedisEventDeduplicator(redis2)

			let executionCount = 0

			const processEvent = async (eventId: string, dedup: RedisEventDeduplicator) => {
				if (await dedup.isProcessed(eventId)) {
					return false // 已處理，跳過
				}

				executionCount++
				await dedup.markProcessed(eventId)
				return true // 新事件，執行
			}

			const eventId = uuidv4()

			// 第一個處理器處理事件
			const result1 = await processEvent(eventId, dedup1)
			expect(result1).toBe(true)
			expect(executionCount).toBe(1)

			// 第二個處理器應檢測到重複
			const result2 = await processEvent(eventId, dedup2)
			expect(result2).toBe(false) // 被去重
			expect(executionCount).toBe(1) // 未執行
		})
	})

	describe('Event Workflow', () => {
		it('應該支持完整的事件重試工作流', async () => {
			const eventId = uuidv4()
			let attempts = 0

			const executeEvent = async (id: string): Promise<boolean> => {
				// 檢查是否已處理
				if (await deduplicator.isProcessed(id)) {
					return false // 已處理，跳過
				}

				// 執行業務邏輯
				attempts++

				if (attempts < 2) {
					// 模擬失敗，不標記為已處理
					throw new Error('Processing failed')
				}

				// 成功時標記為已處理
				await deduplicator.markProcessed(id)
				return true
			}

			// 第一次嘗試（失敗）
			try {
				await executeEvent(eventId)
			} catch {
				// 失敗，重試
			}

			// 第二次嘗試（成功）
			try {
				await executeEvent(eventId)
			} catch {
				// 不應到達此處
			}

			expect(attempts).toBe(2)
			expect(await deduplicator.isProcessed(eventId)).toBe(true)

			// 第三次嘗試（應被去重）
			const result = await executeEvent(eventId)
			expect(result).toBe(false)
			expect(attempts).toBe(2) // 未執行新代碼
		})

		it('應該支持批量事件去重', async () => {
			const eventIds = Array.from({ length: 10 }, () => uuidv4())

			// 標記前 5 個為已處理
			for (let i = 0; i < 5; i++) {
				await deduplicator.markProcessed(eventIds[i]!)
			}

			// 檢查所有事件
			const results = await Promise.all(
				eventIds.map(async (id) => ({
					id,
					isProcessed: await deduplicator.isProcessed(id),
				}))
			)

			const processedCount = results.filter((r) => r.isProcessed).length
			expect(processedCount).toBe(5)
		})
	})

	describe('Redis Failure Handling', () => {
		it('應該在 Redis 連線失敗時有預設行為', async () => {
			const failingRedis: IRedisService = {
				ping: async () => {
					throw new Error('Redis connection failed')
				},
				get: async () => {
					throw new Error('Redis connection failed')
				},
				set: async () => {
					throw new Error('Redis connection failed')
				},
				del: async () => {
					throw new Error('Redis connection failed')
				},
				exists: async () => {
					throw new Error('Redis connection failed')
				},
				rpush: async () => {
					throw new Error('Redis connection failed')
				},
				lpop: async () => {
					throw new Error('Redis connection failed')
				},
				lrange: async () => {
					throw new Error('Redis connection failed')
				},
				llen: async () => {
					throw new Error('Redis connection failed')
				},
			}

			const failingDedup = new RedisEventDeduplicator(failingRedis)

			// isProcessed 應返回 false（傾向於重複執行）
			const isProcessed = await failingDedup.isProcessed(uuidv4())
			expect(isProcessed).toBe(false)

			// markProcessed 應拋出異常
			try {
				await failingDedup.markProcessed(uuidv4())
				expect.unreachable()
			} catch (error) {
				expect(String(error)).toContain('Failed to mark event')
			}

			// remove 應返回 false
			const removed = await failingDedup.remove(uuidv4())
			expect(removed).toBe(false)

			// getProcessedCount 應返回 0
			const count = await failingDedup.getProcessedCount()
			expect(count).toBe(0)

			// listProcessedEventIds 應返回空陣列
			const list = await failingDedup.listProcessedEventIds()
			expect(list.length).toBe(0)
		})
	})

	describe('Performance', () => {
		it('應該高效地處理大量事件', async () => {
			const eventCount = 1000
			const eventIds = Array.from({ length: eventCount }, () => uuidv4())

			// 標記所有事件
			for (const id of eventIds) {
				await deduplicator.markProcessed(id)
			}

			// 驗證計數
			const count = await deduplicator.getProcessedCount()
			expect(count).toBe(eventCount)

			// 驗證存在性檢查
			for (let i = 0; i < 10; i++) {
				const randomId = eventIds[Math.floor(Math.random() * eventCount)]!
				expect(await deduplicator.isProcessed(randomId)).toBe(true)
			}
		})

		it('應該快速檢查未處理的事件', async () => {
			const eventIds = Array.from({ length: 100 }, () => uuidv4())

			for (const id of eventIds) {
				await deduplicator.markProcessed(id)
			}

			// 檢查不存在的事件應快速返回 false
			const nonExistentId = uuidv4()
			const isProcessed = await deduplicator.isProcessed(nonExistentId)
			expect(isProcessed).toBe(false)
		})
	})
})
