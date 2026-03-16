/**
 * @file RedisDistributedSystems.test.ts
 * @description Redis 分散式系統集成測試
 *
 * 驗證 Redis 版本的快取和去重如何在分散式環境中協同工作：
 * - 跨進程/機器的快取共享
 * - 分散式事件去重
 * - M9 + M10 在 Redis 中的組合
 * - 故障轉移和可靠性
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { RedisQueryCache } from '@/Foundation/Infrastructure/Services/RedisQueryCache'
import { RedisEventDeduplicator } from '@/Foundation/Infrastructure/Services/RedisEventDeduplicator'
import type { IRedisService } from '@/Foundation/Infrastructure/Ports/Messaging/IRedisService'
import { v4 as uuidv4 } from 'uuid'

// 簡化版 Mock Redis（用於多實例測試）
class SharedMockRedis implements IRedisService {
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

describe('Redis Distributed Systems Integration', () => {
	let sharedRedis: SharedMockRedis

	beforeEach(() => {
		sharedRedis = new SharedMockRedis()
	})

	describe('Distributed Query Cache', () => {
		it('應該支持多個服務實例共享快取', async () => {
			// 模擬 3 個服務實例
			const cache1 = new RedisQueryCache(sharedRedis)
			const cache2 = new RedisQueryCache(sharedRedis)
			const cache3 = new RedisQueryCache(sharedRedis)

			const testKey = 'shared:products'
			const products = [
				{ id: 1, name: 'Product A' },
				{ id: 2, name: 'Product B' },
			]

			// Instance 1 執行昂貴查詢並快取
			await cache1.set(testKey, products)

			// Instance 2 和 3 應能使用相同快取
			const fromCache2 = await cache2.get<typeof products>(testKey)
			const fromCache3 = await cache3.get<typeof products>(testKey)

			expect(fromCache2).toEqual(products)
			expect(fromCache3).toEqual(products)
		})

		it('應該支持分散式快取失效', async () => {
			const cache1 = new RedisQueryCache(sharedRedis)
			const cache2 = new RedisQueryCache(sharedRedis)

			const cacheKey = 'user:1:profile'
			const userData = { id: 1, name: 'Alice', email: 'alice@example.com' }

			// 建立快取
			await cache1.set(cacheKey, userData)
			expect(await cache2.get(cacheKey)).toEqual(userData)

			// Instance 1 刪除快取（模擬用戶資料更新）
			await cache1.delete(cacheKey)

			// Instance 2 應立即反映快取失效
			expect(await cache2.get(cacheKey)).toBeNull()
		})

		it('應該支持分散式聚合查詢', async () => {
			const cache1 = new RedisQueryCache(sharedRedis)
			const cache2 = new RedisQueryCache(sharedRedis)

			let queryCount = 0

			const executeQuery = async (cacheName: string) => {
				const cacheKey = 'expensive:report'
				let data = await cache1.get<any>(cacheKey)

				if (!data) {
					// 執行昂貴查詢
					queryCount++
					data = {
						generated: new Date().toISOString(),
						results: Array.from({ length: 100 }, (_, i) => ({ id: i })),
					}
					await cache1.set(cacheKey, data, 3600000) // 1 小時
				}

				return data
			}

			// 第一個調用執行查詢
			const result1 = await executeQuery('cache1')
			expect(queryCount).toBe(1)

			// 第二個調用應使用快取
			const result2 = await executeQuery('cache2')
			expect(queryCount).toBe(1) // 未增加

			// 驗證結果一致
			expect(result1).toEqual(result2)
		})
	})

	describe('Distributed Event Deduplication', () => {
		it('應該防止分散式環境中的重複執行', async () => {
			// 模擬多個 Worker 消費相同事件
			const dedup1 = new RedisEventDeduplicator(sharedRedis)
			const dedup2 = new RedisEventDeduplicator(sharedRedis)
			const dedup3 = new RedisEventDeduplicator(sharedRedis)

			let executionCount = 0

			const processEvent = async (eventId: string, dedup: RedisEventDeduplicator) => {
				if (await dedup.isProcessed(eventId)) {
					return false // 已處理
				}

				executionCount++
				await dedup.markProcessed(eventId)
				return true
			}

			const eventId = uuidv4()

			// 三個 Worker 幾乎同時處理相同事件
			const result1 = await processEvent(eventId, dedup1)
			const result2 = await processEvent(eventId, dedup2)
			const result3 = await processEvent(eventId, dedup3)

			// 只有第一個應成功執行
			expect(result1).toBe(true)
			expect(result2).toBe(false)
			expect(result3).toBe(false)

			// 執行計數應為 1
			expect(executionCount).toBe(1)
		})

		it('應該支持分散式批量事件處理', async () => {
			const dedup1 = new RedisEventDeduplicator(sharedRedis)
			const dedup2 = new RedisEventDeduplicator(sharedRedis)

			const eventIds = Array.from({ length: 10 }, () => uuidv4())

			// Worker 1 處理前 5 個
			for (let i = 0; i < 5; i++) {
				await dedup1.markProcessed(eventIds[i]!)
			}

			// Worker 2 應能看到 Worker 1 已處理的事件
			const unprocessedCount = (
				await Promise.all(
					eventIds.map(async (id) => {
						const isProcessed = await dedup2.isProcessed(id)
						return isProcessed ? 0 : 1
					})
				)
			).reduce((a, b) => a + b, 0)

			expect(unprocessedCount).toBe(5)
		})

		it('應該支持分散式 TTL 清理', async () => {
			const dedup1 = new RedisEventDeduplicator(sharedRedis, 1) // 1 秒 TTL
			const dedup2 = new RedisEventDeduplicator(sharedRedis, 1)

			const eventId = uuidv4()

			// 標記為已處理
			await dedup1.markProcessed(eventId)
			expect(await dedup2.isProcessed(eventId)).toBe(true)

			// 等待 TTL 過期
			await new Promise((resolve) => setTimeout(resolve, 1500))

			// 兩個 Worker 都應看到已過期
			expect(await dedup1.isProcessed(eventId)).toBe(false)
			expect(await dedup2.isProcessed(eventId)).toBe(false)
		})
	})

	describe('Combined Cache and Deduplication (M9 + M10)', () => {
		it('應該組合快取和去重提升性能和可靠性', async () => {
			const redis = sharedRedis
			const cache = new RedisQueryCache(redis)
			const dedup = new RedisEventDeduplicator(redis)

			let dbQueryCount = 0

			const processQuery = async (eventId: string, query: string) => {
				// 1. 檢查查詢快取（快取優先）
				const cacheKey = `query:${query}`
				let result = await cache.get<any>(cacheKey)

				if (!result) {
					// 2. 檢查事件去重（避免重複查詢）
					if (await dedup.isProcessed(eventId)) {
						return null // 已處理但無快取，不執行
					}

					// 3. 執行查詢
					dbQueryCount++
					result = {
						data: [{ id: 1, value: 'test' }],
						executedAt: Date.now(),
					}

					// 4. 快取結果
					await cache.set(cacheKey, result, 10000) // 10 秒
				}

				// 5. 標記事件為已處理
				await dedup.markProcessed(eventId)

				return result
			}

			// 場景 1：首次查詢（無快取無去重）
			const eventId1 = uuidv4()
			const query1 = 'SELECT * FROM users WHERE status=active'

			const result1 = await processQuery(eventId1, query1)
			expect(result1).toBeDefined()
			expect(dbQueryCount).toBe(1)

			// 場景 2：相同查詢，不同事件（應使用快取）
			const eventId2 = uuidv4()
			const result2 = await processQuery(eventId2, query1)
			expect(result2).toBeDefined()
			expect(result1).toEqual(result2)
			expect(dbQueryCount).toBe(1) // 未增加

			// 場景 3：相同事件 ID（應被去重）
			const result3 = await processQuery(eventId1, query1)
			expect(result3).toBeDefined()
			expect(result3).toEqual(result1)
			expect(dbQueryCount).toBe(1) // 未增加
		})

		it('應該在分散式重試場景中保持一致性', async () => {
			const redis1 = sharedRedis
			const redis2 = sharedRedis // 共享 Redis

			const cache1 = new RedisQueryCache(redis1)
			const dedup1 = new RedisEventDeduplicator(redis1)

			const cache2 = new RedisQueryCache(redis2)
			const dedup2 = new RedisEventDeduplicator(redis2)

			let processCount = 0

			const processPurchaseEvent = async (
				eventId: string,
				cache: RedisQueryCache,
				dedup: RedisEventDeduplicator
			) => {
				// 1. 快取檢查（優先）
				const resultKey = `purchase:${eventId}`
				let cachedResult = await cache.get<any>(resultKey)

				if (cachedResult) {
					return cachedResult // 使用快取
				}

				// 2. 去重檢查（防止重複執行）
				if (await dedup.isProcessed(eventId)) {
					return null // 已處理但無快取
				}

				// 3. 執行購買流程
				processCount++
				const result = {
					orderId: uuidv4(),
					status: 'completed',
					timestamp: Date.now(),
				}

				// 4. 快取結果
				await cache.set(resultKey, result)

				// 5. 標記為已處理
				await dedup.markProcessed(eventId)

				return result
			}

			const eventId = uuidv4()

			// Worker 1 首次處理
			const result1 = await processPurchaseEvent(eventId, cache1, dedup1)

			// Worker 2 重試（應使用快取，不重複執行）
			const result2 = await processPurchaseEvent(eventId, cache2, dedup2)

			// 應為相同結果
			expect(result1).toEqual(result2)

			// 只執行一次
			expect(processCount).toBe(1)
		})
	})

	describe('Multi-Worker Event Processing', () => {
		it('應該支持多 Worker 並行處理不同事件', async () => {
			const dedup = new RedisEventDeduplicator(sharedRedis)
			const cache = new RedisQueryCache(sharedRedis)

			const eventIds = Array.from({ length: 100 }, () => uuidv4())
			let processedCount = 0

			const processEvent = async (eventId: string) => {
				if (await dedup.isProcessed(eventId)) {
					return false
				}

				processedCount++
				await dedup.markProcessed(eventId)

				// 快取結果
				await cache.set(`event:${eventId}`, { processed: true })

				return true
			}

			// 模擬 3 個 Worker 並行處理
			const results = await Promise.all(
				eventIds.map((id) => processEvent(id))
			)

			// 所有事件應被處理
			const processedTotal = results.filter((r) => r).length
			expect(processedTotal).toBe(100)
			expect(processedCount).toBe(100)

			// 所有事件應在快取中
			const cachedCount = (
				await Promise.all(
					eventIds.map((id) => cache.get(`event:${id}`))
				)
			).filter((r) => r).length

			expect(cachedCount).toBe(100)
		})
	})

	describe('Scale and Performance', () => {
		it('應該支持大規模快取和去重', async () => {
			const cache = new RedisQueryCache(sharedRedis)
			const dedup = new RedisEventDeduplicator(sharedRedis)

			const itemCount = 500
			const eventIds = Array.from({ length: itemCount }, () => uuidv4())

			// 標記所有事件
			for (const id of eventIds) {
				await dedup.markProcessed(id)
			}

			// 快取所有結果
			for (let i = 0; i < itemCount; i++) {
				await cache.set(`result:${eventIds[i]}`, { value: i })
			}

			// 驗證計數
			const dedupCount = await dedup.getProcessedCount()
			expect(dedupCount).toBe(itemCount)

			// 隨機驗證快取
			for (let i = 0; i < 10; i++) {
				const randomIdx = Math.floor(Math.random() * itemCount)
				const cached = await cache.get(`result:${eventIds[randomIdx]}`)
				expect(cached?.value).toBe(randomIdx)
			}
		})
	})
})
