/**
 * @file RedisQueryCache.test.ts
 * @description Redis 查詢快取測試
 *
 * 驗證 RedisQueryCache 的功能：
 * - 分散式快取存取
 * - TTL 和過期
 * - 模式匹配（限制）
 * - 統計追蹤
 * - 故障降級
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { RedisQueryCache } from '@/Foundation/Infrastructure/Services/RedisQueryCache'
import type { IRedisService } from '@/Foundation/Infrastructure/Ports/Messaging/IRedisService'

// Mock Redis 服務（模擬 Redis 行為）
class MockRedisService implements IRedisService {
	private store: Map<string, { value: string; expiresAt?: number }> = new Map()

	async ping(): Promise<string> {
		return 'PONG'
	}

	async get(key: string): Promise<string | null> {
		const entry = this.store.get(key)
		if (!entry) return null

		// 檢查過期
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

		// 檢查過期
		if (entry.expiresAt && entry.expiresAt <= Date.now()) {
			this.store.delete(key)
			return false
		}

		return true
	}

	async rpush(key: string, value: string): Promise<number> {
		// 模擬 Redis List（用於計數）
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

	// 清除所有快取（用於測試）
	clear(): void {
		this.store.clear()
	}
}

describe('Redis Query Cache', () => {
	let redis: MockRedisService
	let cache: RedisQueryCache

	beforeEach(() => {
		redis = new MockRedisService()
		cache = new RedisQueryCache(redis)
	})

	afterEach(() => {
		redis.clear()
	})

	describe('Basic Get and Set', () => {
		it('應該存儲和檢索快取數據', async () => {
			const key = 'user:1'
			const data = { id: 1, name: 'Alice' }

			await cache.set(key, data)
			const retrieved = await cache.get<typeof data>(key)

			expect(retrieved).toEqual(data)
		})

		it('應該返回 null 當快取不存在時', async () => {
			const retrieved = await cache.get('nonexistent')
			expect(retrieved).toBeNull()
		})

		it('應該支持不同的數據型別', async () => {
			const stringData = 'hello'
			const numberData = 42
			const arrayData = [1, 2, 3]
			const complexData = { nested: { value: true } }

			await cache.set('string', stringData)
			await cache.set('number', numberData)
			await cache.set('array', arrayData)
			await cache.set('complex', complexData)

			expect(await cache.get('string')).toBe(stringData)
			expect(await cache.get('number')).toBe(numberData)
			expect(await cache.get('array')).toEqual(arrayData)
			expect(await cache.get('complex')).toEqual(complexData)
		})
	})

	describe('TTL and Expiration', () => {
		it('應該在 TTL 後過期快取', async () => {
			const key = 'temp'
			const data = { value: 'temporary' }

			// 注意：第二個參數是毫秒，但 Redis 會轉換為秒
			// 1000ms → Math.ceil(1000/1000) = 1 秒
			await cache.set(key, data, 1000) // 1000ms → 1 秒 TTL
			expect(await cache.get(key)).toEqual(data)

			// 等待過期（1秒 + 500ms 緩衝）
			await new Promise((resolve) => setTimeout(resolve, 1500))

			expect(await cache.get(key)).toBeNull()
		})

		it('應該支持無期限快取（TTL=0）', async () => {
			const key = 'permanent'
			const data = { value: 'permanent' }

			await cache.set(key, data, 0)
			expect(await cache.get(key)).toEqual(data)

			// 等待後仍應存在
			await new Promise((resolve) => setTimeout(resolve, 150))
			expect(await cache.get(key)).toEqual(data)
		})

		it('應該使用默認 TTL', async () => {
			const data = { value: 'default' }
			await cache.set('key', data) // 不指定 TTL，使用默認（1 小時）

			expect(await cache.get('key')).toEqual(data)
		})
	})

	describe('Check Existence', () => {
		it('應該檢查快取是否存在且有效', async () => {
			const key = 'test'
			const data = { value: 'test' }

			expect(await cache.has(key)).toBe(false)

			await cache.set(key, data)
			expect(await cache.has(key)).toBe(true)
		})

		it('應該在過期後返回 false', async () => {
			const key = 'expiring'
			// 1000ms TTL = 1 秒
			await cache.set(key, { value: 'data' }, 1000)

			expect(await cache.has(key)).toBe(true)

			// 等待過期
			await new Promise((resolve) => setTimeout(resolve, 1500))
			expect(await cache.has(key)).toBe(false)
		})
	})

	describe('Delete Operations', () => {
		it('應該刪除特定快取', async () => {
			const key = 'deleteme'
			await cache.set(key, { value: 'test' })

			expect(await cache.has(key)).toBe(true)

			const deleted = await cache.delete(key)
			expect(deleted).toBe(true)
			expect(await cache.has(key)).toBe(false)
		})

		it('應該在刪除不存在的快取時返回 false', async () => {
			const deleted = await cache.delete('nonexistent')
			expect(deleted).toBe(false)
		})

		it('應該支持模式刪除（但由於 Redis 限制，返回 0）', async () => {
			await cache.set('user:1', { id: 1 })
			await cache.set('user:2', { id: 2 })
			await cache.set('post:1', { id: 1 })

			// Redis 版本無法進行模式刪除
			const deleted = await cache.deletePattern('user:*')
			expect(deleted).toBe(0) // Redis 無法原生支援模式匹配

			// 仍需手動刪除
			await cache.delete('user:1')
			await cache.delete('user:2')

			expect(await cache.has('user:1')).toBe(false)
			expect(await cache.has('user:2')).toBe(false)
			expect(await cache.has('post:1')).toBe(true)
		})
	})

	describe('Cache Statistics', () => {
		it('應該追蹤快取命中和未命中', async () => {
			const key = 'tracked'
			await cache.set(key, { value: 'test' })

			// 初始狀態
			let stats = await cache.getStats()
			expect(stats.hits).toBe(0)
			expect(stats.misses).toBe(0)

			// 命中
			await cache.get(key)
			stats = await cache.getStats()
			expect(stats.hits).toBe(1)
			expect(stats.misses).toBe(0)

			// 未命中
			await cache.get('nonexistent')
			stats = await cache.getStats()
			expect(stats.hits).toBe(1)
			expect(stats.misses).toBe(1)
		})

		it('應該計算命中率', async () => {
			const key = 'test'
			await cache.set(key, { value: 'data' })

			// 3 次命中
			await cache.get(key)
			await cache.get(key)
			await cache.get(key)

			// 2 次未命中
			await cache.get('miss1')
			await cache.get('miss2')

			const stats = await cache.getStats()
			expect(stats.hits).toBe(3)
			expect(stats.misses).toBe(2)
			expect(stats.hitRate).toBe(3 / 5)
		})

		it('應該報告快取大小為 -1（Redis 無法統計）', async () => {
			await cache.set('key1', { value: 1 })
			await cache.set('key2', { value: 2 })

			const stats = await cache.getStats()
			expect(stats.size).toBe(-1) // Redis 無法輕易統計快取項目數
		})
	})

	describe('Distributed Cache Behavior', () => {
		it('應該支持多個快取實例共享數據', async () => {
			const cache1 = new RedisQueryCache(redis)
			const cache2 = new RedisQueryCache(redis)

			const key = 'shared:data'
			const data = { id: 1, value: 'shared' }

			// cache1 寫入
			await cache1.set(key, data)

			// cache2 讀取（同一 Redis 後端）
			const retrieved = await cache2.get<typeof data>(key)
			expect(retrieved).toEqual(data)
		})

		it('應該在分散式環境中保持一致性', async () => {
			const redis1 = new MockRedisService()
			const redis2 = redis1 // 模擬共享 Redis

			const cache1 = new RedisQueryCache(redis1)
			const cache2 = new RedisQueryCache(redis2)

			const testData = { timestamp: Date.now() }

			await cache1.set('test', testData)
			const data1 = await cache1.get('test')
			const data2 = await cache2.get('test')

			expect(data1).toEqual(data2)
		})
	})

	describe('Redis Failure Handling', () => {
		it('應該在 Redis 連線失敗時優雅降級', async () => {
			let callCount = 0

			const failingRedis: IRedisService = {
				ping: async () => {
					throw new Error('Redis connection failed')
				},
				get: async () => {
					callCount++
					if (callCount === 1) {
						// 第一次調用 get() 失敗
						throw new Error('Redis connection failed')
					}
					return null
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
					// rpush 用於統計，應被 try-catch 吞掉
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

			const failingCache = new RedisQueryCache(failingRedis)

			// get 應返回 null（而非拋出異常）
			const result = await failingCache.get('key')
			expect(result).toBeNull()

			// set 應優雅失敗（不拋出異常）
			try {
				await failingCache.set('key', { data: 'test' })
				// 應該優雅失敗，返回 undefined
			} catch {
				// 不應到達此處
				expect.unreachable()
			}

			// has 應返回 false
			const exists = await failingCache.has('key')
			expect(exists).toBe(false)

			// delete 應返回 false
			const deleted = await failingCache.delete('key')
			expect(deleted).toBe(false)

			// getStats 應返回空統計
			const stats = await failingCache.getStats()
			expect(stats.hits).toBe(0)
			expect(stats.misses).toBe(0)
		})
	})

	describe('Performance', () => {
		it('應該支持大量快取項目', async () => {
			const itemCount = 100 // 減少數量避免測試超時

			for (let i = 0; i < itemCount; i++) {
				await cache.set(`item:${i}`, { value: i })
			}

			// 隨機檢索應成功
			const randomIndex = Math.floor(Math.random() * itemCount)
			const data = await cache.get(`item:${randomIndex}`)
			expect(data).toBeDefined()
			expect(data?.value).toBe(randomIndex)
		})

		it('應該高效地處理大型對象', async () => {
			const largeObject = {
				users: Array.from({ length: 100 }, (_, i) => ({
					id: i,
					name: `User ${i}`,
					email: `user${i}@example.com`,
				})),
			}

			await cache.set('large:data', largeObject)
			const retrieved = await cache.get('large:data')

			expect(retrieved).toEqual(largeObject)
			expect(retrieved?.users.length).toBe(100)
		})
	})
})
