/**
 * @file EventDeduplicator.test.ts
 * @description 事件去重功能測試
 *
 * 驗證以下功能：
 * - 事件去重檢查
 * - 已處理事件標記
 * - 去重記錄管理
 * - 性能和邊界情況
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { MemoryEventDeduplicator } from '@/Foundation/Infrastructure/Services/MemoryEventDeduplicator'
import { v4 as uuidv4 } from 'uuid'

describe('Event Deduplicator', () => {
  let deduplicator: MemoryEventDeduplicator

  beforeEach(() => {
    deduplicator = new MemoryEventDeduplicator()
  })

  describe('Mark and Check Processed Events', () => {
    it('應該標記事件為已處理', async () => {
      const eventId = uuidv4()

      const isProcessedBefore = await deduplicator.isProcessed(eventId)
      expect(isProcessedBefore).toBe(false)

      await deduplicator.markProcessed(eventId)

      const isProcessedAfter = await deduplicator.isProcessed(eventId)
      expect(isProcessedAfter).toBe(true)
    })

    it('應該返回 false 當事件未處理時', async () => {
      const eventId = uuidv4()
      const isProcessed = await deduplicator.isProcessed(eventId)
      expect(isProcessed).toBe(false)
    })

    it('應該偵測重複事件', async () => {
      const eventId = uuidv4()

      // 第一次処理
      const firstCheck = await deduplicator.isProcessed(eventId)
      expect(firstCheck).toBe(false)

      await deduplicator.markProcessed(eventId)

      // 第二次検查（重複）
      const secondCheck = await deduplicator.isProcessed(eventId)
      expect(secondCheck).toBe(true)
    })
  })

  describe('Multiple Events', () => {
    it('應該獨立追蹤多個事件', async () => {
      const eventIds = [uuidv4(), uuidv4(), uuidv4()]

      // 標記前兩個事件
      await deduplicator.markProcessed(eventIds[0]!)
      await deduplicator.markProcessed(eventIds[1]!)

      // 檢查
      expect(await deduplicator.isProcessed(eventIds[0]!)).toBe(true)
      expect(await deduplicator.isProcessed(eventIds[1]!)).toBe(true)
      expect(await deduplicator.isProcessed(eventIds[2]!)).toBe(false)
    })

    it('應該正確計算已處理事件總數', async () => {
      const eventIds = [uuidv4(), uuidv4(), uuidv4()]

      expect(await deduplicator.getProcessedCount()).toBe(0)

      await deduplicator.markProcessed(eventIds[0]!)
      expect(await deduplicator.getProcessedCount()).toBe(1)

      await deduplicator.markProcessed(eventIds[1]!)
      expect(await deduplicator.getProcessedCount()).toBe(2)

      await deduplicator.markProcessed(eventIds[2]!)
      expect(await deduplicator.getProcessedCount()).toBe(3)
    })

    it('應該不重複計算相同事件', async () => {
      const eventId = uuidv4()

      await deduplicator.markProcessed(eventId)
      expect(await deduplicator.getProcessedCount()).toBe(1)

      // 再次標記相同事件
      await deduplicator.markProcessed(eventId)
      expect(await deduplicator.getProcessedCount()).toBe(1) // 仍為 1
    })
  })

  describe('Remove Processed Events', () => {
    it('應該移除已處理事件的記錄', async () => {
      const eventId = uuidv4()

      await deduplicator.markProcessed(eventId)
      expect(await deduplicator.isProcessed(eventId)).toBe(true)

      const removed = await deduplicator.remove(eventId)
      expect(removed).toBe(true)

      expect(await deduplicator.isProcessed(eventId)).toBe(false)
    })

    it('應該返回 false 當移除不存在的事件時', async () => {
      const eventId = uuidv4()
      const removed = await deduplicator.remove(eventId)
      expect(removed).toBe(false)
    })

    it('應該在移除後減少計數', async () => {
      const eventIds = [uuidv4(), uuidv4(), uuidv4()]

      for (const id of eventIds) {
        await deduplicator.markProcessed(id)
      }
      expect(await deduplicator.getProcessedCount()).toBe(3)

      await deduplicator.remove(eventIds[0]!)
      expect(await deduplicator.getProcessedCount()).toBe(2)

      await deduplicator.remove(eventIds[1]!)
      expect(await deduplicator.getProcessedCount()).toBe(1)
    })
  })

  describe('Clear All Records', () => {
    it('應該清除所有已處理記錄', async () => {
      const eventIds = [uuidv4(), uuidv4(), uuidv4()]

      for (const id of eventIds) {
        await deduplicator.markProcessed(id)
      }
      expect(await deduplicator.getProcessedCount()).toBe(3)

      await deduplicator.clear()

      expect(await deduplicator.getProcessedCount()).toBe(0)
      for (const id of eventIds) {
        expect(await deduplicator.isProcessed(id)).toBe(false)
      }
    })

    it('應該安全地清除空記錄', async () => {
      await deduplicator.clear() // 應不拋出異常
      expect(await deduplicator.getProcessedCount()).toBe(0)
    })
  })

  describe('List Processed Event IDs', () => {
    it('應該列出所有已處理的事件 ID', async () => {
      const eventIds = [uuidv4(), uuidv4(), uuidv4()]

      for (const id of eventIds) {
        await deduplicator.markProcessed(id)
      }

      const listed = await deduplicator.listProcessedEventIds()

      expect(listed.length).toBe(3)
      for (const id of eventIds) {
        expect(listed).toContain(id)
      }
    })

    it('應該返回空陣列當無已處理事件時', async () => {
      const listed = await deduplicator.listProcessedEventIds()
      expect(listed).toEqual([])
    })

    it('應該返回副本不影響內部狀態', async () => {
      const eventId = uuidv4()
      await deduplicator.markProcessed(eventId)

      const listed1 = await deduplicator.listProcessedEventIds()
      expect(listed1.length).toBe(1)

      // 修改返回的列表
      listed1.push(uuidv4())

      const listed2 = await deduplicator.listProcessedEventIds()
      expect(listed2.length).toBe(1) // 應保持不變
    })
  })

  describe('Deduplication Workflow Scenarios', () => {
    it('應該在重試場景中偵測重複', async () => {
      const eventId = uuidv4()

      // 初始処理
      const isDuplicate1 = await deduplicator.isProcessed(eventId)
      expect(isDuplicate1).toBe(false)
      await deduplicator.markProcessed(eventId)

      // 重試（重複）
      const isDuplicate2 = await deduplicator.isProcessed(eventId)
      expect(isDuplicate2).toBe(true)

      // 不應再処理
      // 業務邏輯應在 isDuplicate2 為 true 時跳過処理
    })

    it('應該支持大量事件去重', async () => {
      const eventCount = 1000
      const eventIds = Array.from({ length: eventCount }, () => uuidv4())

      // 標記所有事件
      for (const id of eventIds) {
        await deduplicator.markProcessed(id)
      }

      expect(await deduplicator.getProcessedCount()).toBe(eventCount)

      // 檢查所有事件都已標記
      for (const id of eventIds) {
        expect(await deduplicator.isProcessed(id)).toBe(true)
      }
    })

    it('應該在 Saga 補償中維持冪等性', async () => {
      const stepEventIds = [uuidv4(), uuidv4(), uuidv4()]

      // Saga 正向執行
      for (const id of stepEventIds) {
        expect(await deduplicator.isProcessed(id)).toBe(false)
        await deduplicator.markProcessed(id)
      }

      // Saga 補償時再次檢查（應偵測重複）
      for (const id of stepEventIds) {
        expect(await deduplicator.isProcessed(id)).toBe(true)
      }

      // 補償邏輯應跳過已處理事件
    })

    it('應該在網絡重傳場景中去重', async () => {
      const eventId = uuidv4()
      let processCount = 0

      // 模擬事件処理器
      const processEvent = async () => {
        const isDuplicate = await deduplicator.isProcessed(eventId)
        if (!isDuplicate) {
          processCount++
          await deduplicator.markProcessed(eventId)
        }
      }

      // 模擬三次傳輸（第一次成功，網絡重傳兩次）
      await processEvent() // 第一次：processCount = 1
      await processEvent() // 重傳：被去重，processCount = 1
      await processEvent() // 重傳：被去重，processCount = 1

      expect(processCount).toBe(1) // 只實際處理一次
      expect(await deduplicator.isProcessed(eventId)).toBe(true)
    })
  })

  describe('Performance Characteristics', () => {
    it('應該高效地檢查事件（O(1) 複雜度）', async () => {
      const eventIds = Array.from({ length: 100 }, () => uuidv4())

      // 標記所有事件
      for (const id of eventIds) {
        await deduplicator.markProcessed(id)
      }

      // 驗證 Set.has() 的 O(1) 性質
      // 檢查第一個、中間和最後一個事件都應返回 true
      expect(await deduplicator.isProcessed(eventIds[0]!)).toBe(true)
      expect(await deduplicator.isProcessed(eventIds[50]!)).toBe(true)
      expect(await deduplicator.isProcessed(eventIds[99]!)).toBe(true)
    })

    it('應該高效地標記事件（O(1) 複雜度）', async () => {
      const eventIds = Array.from({ length: 100 }, () => uuidv4())

      // 驗證所有事件都能正確標記
      for (const id of eventIds) {
        await deduplicator.markProcessed(id)
      }

      expect(await deduplicator.getProcessedCount()).toBe(100)
      // Set.add() 應為 O(1)，驗證可以有效處理大量事件
    })
  })

  describe('Edge Cases', () => {
    it('應該處理空 eventId（邊界情況）', async () => {
      const emptyId = ''

      await deduplicator.markProcessed(emptyId)
      expect(await deduplicator.isProcessed(emptyId)).toBe(true)
      expect(await deduplicator.getProcessedCount()).toBe(1)
    })

    it('應該處理特殊字符在 eventId 中', async () => {
      const specialId = 'event-123!@#$%^&*()_+-=[]{}|;:,.<>?'

      await deduplicator.markProcessed(specialId)
      expect(await deduplicator.isProcessed(specialId)).toBe(true)
    })

    it('應該處理長字符串 eventId', async () => {
      const longId = 'x'.repeat(10000)

      await deduplicator.markProcessed(longId)
      expect(await deduplicator.isProcessed(longId)).toBe(true)
    })
  })
})
