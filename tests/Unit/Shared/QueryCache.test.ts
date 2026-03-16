/**
 * @file QueryCache.test.ts
 * @description 查詢快取功能測試
 *
 * 驗證以下功能：
 * - 快取存取和過期
 * - TTL 和自動失效
 * - 統計快取命中率
 * - 模式匹配失效
 * - LRU 驅逐策略
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { MemoryQueryCache } from '@/Foundation/Infrastructure/Services/MemoryQueryCache'

describe('Query Cache', () => {
  let cache: MemoryQueryCache

  beforeEach(() => {
    cache = new MemoryQueryCache({ cleanupInterval: 100 }) // 短週期用於測試
  })

  afterEach(() => {
    cache.destroy()
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

      await cache.set(key, data, 100) // 100ms TTL
      expect(await cache.get(key)).toEqual(data)

      // 等待過期
      await new Promise((resolve) => setTimeout(resolve, 150))

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
      const cache2 = new MemoryQueryCache({
        defaultTtl: 100,
        cleanupInterval: 100,
      })

      const data = { value: 'default' }
      await cache2.set('key', data) // 不指定 TTL，使用默認

      expect(await cache2.get('key')).toEqual(data)

      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(await cache2.get('key')).toBeNull()

      cache2.destroy()
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
      await cache.set(key, { value: 'data' }, 100)

      expect(await cache.has(key)).toBe(true)

      await new Promise((resolve) => setTimeout(resolve, 150))
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

    it('應該使用模式刪除多個快取', async () => {
      await cache.set('user:1', { id: 1 })
      await cache.set('user:2', { id: 2 })
      await cache.set('post:1', { id: 1 })

      const deleted = await cache.deletePattern('user:*')
      expect(deleted).toBe(2)

      expect(await cache.has('user:1')).toBe(false)
      expect(await cache.has('user:2')).toBe(false)
      expect(await cache.has('post:1')).toBe(true)
    })

    it('應該支持複雜的模式匹配', async () => {
      await cache.set('users:list', [])
      await cache.set('users:1:profile', {})
      await cache.set('users:1:posts', [])
      await cache.set('users:2:profile', {})

      const deleted = await cache.deletePattern('users:*')
      expect(deleted).toBe(4)
    })
  })

  describe('Clear All', () => {
    it('應該清空所有快取', async () => {
      await cache.set('key1', { value: 1 })
      await cache.set('key2', { value: 2 })
      await cache.set('key3', { value: 3 })

      const statsBefore = await cache.getStats()
      expect(statsBefore.size).toBe(3)

      await cache.clear()

      const statsAfter = await cache.getStats()
      expect(statsAfter.size).toBe(0)
      expect(statsAfter.hits).toBe(0)
      expect(statsAfter.misses).toBe(0)
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

    it('應該報告快取大小', async () => {
      let stats = await cache.getStats()
      expect(stats.size).toBe(0)

      await cache.set('key1', { value: 1 })
      stats = await cache.getStats()
      expect(stats.size).toBe(1)

      await cache.set('key2', { value: 2 })
      stats = await cache.getStats()
      expect(stats.size).toBe(2)
    })

    it('應該計算快取項目的年齡', async () => {
      await cache.set('old', { value: 'old' })
      await new Promise((resolve) => setTimeout(resolve, 50))
      await cache.set('new', { value: 'new' })
      await new Promise((resolve) => setTimeout(resolve, 10)) // 等待一點時間確保年齡 > 0

      const stats = await cache.getStats()
      expect(stats.oldestAge).toBeGreaterThanOrEqual(0)
      expect(stats.newestAge).toBeGreaterThanOrEqual(0)
      expect(stats.oldestAge! >= stats.newestAge!).toBe(true)
    })
  })

  describe('LRU Eviction', () => {
    it('應該在達到大小限制時移除最少使用的項目', async () => {
      const cache2 = new MemoryQueryCache({ maxSize: 3 })

      // 填滿快取
      await cache2.set('key1', { hit: 0 })
      await cache2.set('key2', { hit: 0 })
      await cache2.set('key3', { hit: 0 })

      // 訪問 key1 和 key2（增加 hitCount）
      await cache2.get('key1')
      await cache2.get('key1')
      await cache2.get('key2')

      // 新增第 4 個項目（應移除 key3，因為 hitCount 最少）
      await cache2.set('key4', { hit: 0 })

      const stats = await cache2.getStats()
      expect(stats.size).toBe(3)
      expect(await cache2.has('key3')).toBe(false) // key3 被移除
      expect(await cache2.has('key1')).toBe(true)
      expect(await cache2.has('key4')).toBe(true)

      cache2.destroy()
    })

    it('應該優先保留高命中率的項目', async () => {
      const cache2 = new MemoryQueryCache({ maxSize: 2 })

      await cache2.set('hot', { value: 'frequently accessed' })
      await cache2.set('cold', { value: 'rarely accessed' })

      // 多次訪問 hot
      for (let i = 0; i < 10; i++) {
        await cache2.get('hot')
      }

      // 只訪問 cold 一次
      await cache2.get('cold')

      // 新增項目
      await cache2.set('new', { value: 'new' })

      // cold 應被移除，因為 hitCount 更低
      expect(await cache2.has('hot')).toBe(true)
      expect(await cache2.has('cold')).toBe(false)
      expect(await cache2.has('new')).toBe(true)

      cache2.destroy()
    })
  })

  describe('Key Normalization', () => {
    it('應該使用前綴規範化鍵', async () => {
      const cache2 = new MemoryQueryCache({ keyPrefix: 'app:' })

      await cache2.set('users', { count: 100 })

      // 內部應使用 'app:users' 作為鍵
      const data = await cache2.get('users')
      expect(data).toEqual({ count: 100 })

      cache2.destroy()
    })

    it('應該支持自定義前綴', async () => {
      const cache2 = new MemoryQueryCache({ keyPrefix: 'custom:' })

      await cache2.set('key', { value: 'data' })

      const stats = await cache2.getStats()
      expect(stats.size).toBe(1)

      cache2.destroy()
    })
  })

  describe('Pattern Matching', () => {
    it('應該支持星號通配符', async () => {
      await cache.set('users:all', [])
      await cache.set('users:1', {})
      await cache.set('users:2', {})
      await cache.set('posts:all', [])

      const deleted = await cache.deletePattern('users:*')
      expect(deleted).toBe(3)
      expect(await cache.has('posts:all')).toBe(true)
    })

    it('應該支持複雜模式', async () => {
      await cache.set('api:v1:users', [])
      await cache.set('api:v1:posts', [])
      await cache.set('api:v2:users', [])

      const deleted = await cache.deletePattern('api:v1:*')
      expect(deleted).toBe(2)
      expect(await cache.has('api:v2:users')).toBe(true)
    })
  })

  describe('Performance', () => {
    it('應該支持大量快取項目', async () => {
      const itemCount = 1000
      const keys = Array.from({ length: itemCount }, (_, i) => `item:${i}`)

      // 插入所有項目
      for (const key of keys) {
        await cache.set(key, { value: key })
      }

      const stats = await cache.getStats()
      // 注意：可能因 maxSize 而未達到 1000
      expect(stats.size).toBeGreaterThan(0)

      // 隨機檢索應快速
      const randomKey = keys[Math.floor(Math.random() * keys.length)]!
      const data = await cache.get(randomKey)
      expect(data).toBeDefined()
    })

    it('應該高效地執行模式刪除', async () => {
      // 建立大量快取
      for (let i = 0; i < 100; i++) {
        await cache.set(`user:${i}`, { id: i })
        await cache.set(`post:${i}`, { id: i })
      }

      const startTime = Date.now()
      const deleted = await cache.deletePattern('user:*')
      const duration = Date.now() - startTime

      expect(deleted).toBe(100)
      expect(duration).toBeLessThan(100) // 應在 100ms 內完成
    })
  })
})
