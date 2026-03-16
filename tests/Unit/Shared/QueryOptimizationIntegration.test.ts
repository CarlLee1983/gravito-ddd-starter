/**
 * @file QueryOptimizationIntegration.test.ts
 * @description 查詢優化集成流程測試
 *
 * 驗證快取如何與實際查詢流程整合：
 * - 查詢快取和事件去重的組合
 * - 快取失效策略
 * - 性能改進量化
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { MemoryQueryCache } from '@/Foundation/Infrastructure/Services/MemoryQueryCache'
import { MemoryEventDeduplicator } from '@/Foundation/Infrastructure/Services/MemoryEventDeduplicator'
import { v4 as uuidv4 } from 'uuid'

describe('Query Optimization Integration', () => {
  let cache: MemoryQueryCache
  let deduplicator: MemoryEventDeduplicator
  let queryExecutionCount: number

  beforeEach(() => {
    cache = new MemoryQueryCache({ cleanupInterval: 100 })
    deduplicator = new MemoryEventDeduplicator()
    queryExecutionCount = 0
  })

  afterEach(() => {
    cache.destroy()
  })

  describe('Cached Query Execution', () => {
    it('應該避免重複執行相同的查詢', async () => {
      // 模擬數據庫查詢
      const executeQuery = async (userId: string) => {
        const cacheKey = `user:${userId}:profile`

        // 檢查快取
        const cached = await cache.get<{ id: string; name: string }>(cacheKey)
        if (cached) {
          return cached
        }

        // 執行查詢
        queryExecutionCount++
        const result = { id: userId, name: `User ${userId}` }
        await cache.set(cacheKey, result, 5000)

        return result
      }

      // 第一次查詢（執行）
      const result1 = await executeQuery('user-1')
      expect(queryExecutionCount).toBe(1)
      expect(result1.name).toBe('User user-1')

      // 第二次查詢（從快取）
      const result2 = await executeQuery('user-1')
      expect(queryExecutionCount).toBe(1) // 未增加
      expect(result2.name).toBe('User user-1')

      // 不同用戶的查詢（執行）
      const result3 = await executeQuery('user-2')
      expect(queryExecutionCount).toBe(2)
    })

    it('應該在複雜查詢中顯著降低執行時間', async () => {
      // 模擬複雜的 JOIN 查詢
      const slowQuery = async (): Promise<any[]> => {
        queryExecutionCount++
        // 模擬 100ms 的查詢時間
        await new Promise((resolve) => setTimeout(resolve, 50))
        return [
          { id: 1, name: 'Alice', role: 'admin' },
          { id: 2, name: 'Bob', role: 'user' },
          { id: 3, name: 'Charlie', role: 'user' },
        ]
      }

      const cacheKey = 'users:with:roles'

      // 首次查詢（經過數據庫）
      const start1 = performance.now()
      let result = await cache.get<any[]>(cacheKey)
      if (!result) {
        result = await slowQuery()
        await cache.set(cacheKey, result, 5000)
      }
      const time1 = performance.now() - start1

      // 快取查詢（從記憶體）
      const start2 = performance.now()
      const cached = await cache.get<any[]>(cacheKey)
      const time2 = performance.now() - start2

      expect(queryExecutionCount).toBe(1)
      expect(cached).toEqual(result)
      expect(time2).toBeLessThan(time1) // 快取查詢應更快
    })
  })

  describe('Cache Invalidation Strategies', () => {
    it('應該在數據修改時使快取失效', async () => {
      const userId = 'user-1'
      const cacheKey = `user:${userId}:profile`

      // 初始查詢
      await cache.set(cacheKey, { id: userId, name: 'Alice' })
      expect(await cache.has(cacheKey)).toBe(true)

      // 修改事件觸發快取失效
      await cache.delete(cacheKey)

      // 快取應已失效
      expect(await cache.has(cacheKey)).toBe(false)
    })

    it('應該支持批量失效相關的快取', async () => {
      const userId = 'user-1'

      // 建立多個相關快取
      await cache.set(`user:${userId}:profile`, { name: 'Alice' })
      await cache.set(`user:${userId}:posts`, [])
      await cache.set(`user:${userId}:followers`, [])
      await cache.set(`post:1:author`, { id: userId })

      // 用戶更新事件：失效所有用戶相關快取
      const invalidated = await cache.deletePattern(`user:${userId}:*`)
      expect(invalidated).toBe(3)

      // 驗證
      expect(await cache.has(`user:${userId}:profile`)).toBe(false)
      expect(await cache.has(`user:${userId}:posts`)).toBe(false)
      expect(await cache.has(`user:${userId}:followers`)).toBe(false)
      expect(await cache.has(`post:1:author`)).toBe(true) // 不應失效
    })

    it('應該支持時間基的失效（TTL）', async () => {
      const key = 'hot:data'
      const data = { value: 'frequently accessed' }

      // 快速過期的快取（用於熱點數據）
      await cache.set(key, data, 100)
      expect(await cache.has(key)).toBe(true)

      // 等待過期
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(await cache.has(key)).toBe(false)
    })
  })

  describe('Combined Caching and Deduplication', () => {
    it('應該結合快取和去重提升性能和可靠性', async () => {
      let handlerExecutionCount = 0

      // 模擬完整的查詢和事件處理流程
      const processQueryEvent = async (eventId: string, query: string) => {
        // 1. 事件去重檢查
        if (await deduplicator.isProcessed(eventId)) {
          console.log('Event already processed')
          return null
        }

        // 2. 查詢快取檢查
        const cacheKey = `query:${query}`
        const cached = await cache.get<any>(cacheKey)
        if (cached) {
          console.log('Query result cached')
          return cached
        }

        // 3. 執行查詢
        handlerExecutionCount++
        const result = { query, timestamp: Date.now(), data: [] }

        // 4. 快取結果
        await cache.set(cacheKey, result, 5000)

        // 5. 標記事件為已處理
        await deduplicator.markProcessed(eventId)

        return result
      }

      // 場景：重試時避免重複執行
      const eventId = uuidv4()
      const query = 'SELECT * FROM users'

      // 初始執行
      const result1 = await processQueryEvent(eventId, query)
      expect(handlerExecutionCount).toBe(1)
      expect(result1).toBeDefined()

      // 重試（事件被去重）
      const result2 = await processQueryEvent(eventId, query)
      expect(result2).toBeNull() // 被去重，無返回
      expect(handlerExecutionCount).toBe(1) // 未執行

      // 相同查詢不同事件（使用快取）
      const eventId2 = uuidv4()
      const result3 = await processQueryEvent(eventId2, query)
      expect(handlerExecutionCount).toBe(1) // 未增加（使用快取）
      expect(result3).toEqual(result1) // 返回相同結果
    })
  })

  describe('Cache Hit Metrics', () => {
    it('應該追蹤快取效果', async () => {
      const keys = Array.from({ length: 10 }, (_, i) => `data:${i}`)

      // 初始化數據
      for (const key of keys) {
        await cache.set(key, { value: key })
      }

      // 模擬訪問模式（某些鍵被頻繁訪問）
      for (let i = 0; i < 5; i++) {
        await cache.get('data:0') // 熱點數據
        await cache.get('data:1')
      }

      for (let i = 0; i < 2; i++) {
        await cache.get('data:9') // 冷點數據
      }

      // 模擬未命中
      await cache.get('data:999') // 不存在的鍵

      const stats = await cache.getStats()
      expect(stats.hits).toBeGreaterThan(0)
      expect(stats.misses).toBeGreaterThan(0)
      expect(stats.hitRate).toBeGreaterThan(0)
      expect(stats.hitRate).toBeLessThan(1)
    })
  })

  describe('Scenario: Frequently Accessed Data', () => {
    it('應該高效地服務熱點數據', async () => {
      const commonQuery = 'SELECT * FROM products WHERE category = "electronics"'
      const cacheKey = 'products:electronics'
      let dbQueries = 0

      // 模擬數據庫查詢
      const getProducts = async (): Promise<any[]> => {
        const cached = await cache.get(cacheKey)
        if (cached) {
          return cached
        }

        dbQueries++
        const result = Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Product ${i}`,
          price: Math.random() * 1000,
        }))
        await cache.set(cacheKey, result, 10000)
        return result
      }

      // 多個請求（應只查詢一次數據庫）
      for (let i = 0; i < 100; i++) {
        const products = await getProducts()
        expect(products.length).toBe(100)
      }

      expect(dbQueries).toBe(1) // 只查詢一次
    })

    it('應該在更新時自動失效相關快取', async () => {
      const productId = 'prod-1'

      // 建立快取
      await cache.set(`product:${productId}`, { id: productId, price: 100 })
      await cache.set(`product:${productId}:reviews`, [])
      await cache.set(`product:${productId}:inventory`, { stock: 50 })

      // 模擬產品更新事件
      await cache.deletePattern(`product:${productId}:*`)

      // 驗證快取已失效
      expect(await cache.has(`product:${productId}`)).toBe(true) // 基礎鍵保留
      expect(await cache.has(`product:${productId}:reviews`)).toBe(false)
      expect(await cache.has(`product:${productId}:inventory`)).toBe(false)
    })
  })
})
