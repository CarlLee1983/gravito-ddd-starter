/**
 * @file EventDeduplicationIntegration.test.ts
 * @description 事件去重集成流程測試
 *
 * 驗證去重如何與事件分發和重試機制整合：
 * - 去重在事件分發流程中的應用
 * - 重試場景中的去重
 * - 分散式場景中的冪等性
 * - Saga 補償中的重複預防
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { MemoryEventDeduplicator } from '@/Foundation/Infrastructure/Services/MemoryEventDeduplicator'
import type { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import { v4 as uuidv4 } from 'uuid'

describe('Event Deduplication Integration', () => {
  let deduplicator: MemoryEventDeduplicator

  beforeEach(() => {
    deduplicator = new MemoryEventDeduplicator()
  })

  describe('Event Processing with Deduplication', () => {
    it('應該在事件分發流程中進行去重', async () => {
      const eventId = uuidv4()
      let handlerCallCount = 0

      // 模擬事件處理器
      const processEvent = async (eventId: string) => {
        const isDuplicate = await deduplicator.isProcessed(eventId)
        if (isDuplicate) {
          return { skipped: true, reason: '重複事件' }
        }

        // 處理邏輯
        handlerCallCount++
        await deduplicator.markProcessed(eventId)

        return { processed: true }
      }

      // 初始事件
      const result1 = await processEvent(eventId)
      expect(result1).toEqual({ processed: true })
      expect(handlerCallCount).toBe(1)

      // 重複事件（應跳過）
      const result2 = await processEvent(eventId)
      expect(result2).toEqual({ skipped: true, reason: '重複事件' })
      expect(handlerCallCount).toBe(1) // 未增加
    })

    it('應該在多個處理器中應用相同的去重', async () => {
      const eventId = uuidv4()
      let handler1CallCount = 0
      let handler2CallCount = 0

      const handler1 = async (eventId: string) => {
        if (await deduplicator.isProcessed(eventId)) {
          return // 被去重
        }
        handler1CallCount++
      }

      const handler2 = async (eventId: string) => {
        if (await deduplicator.isProcessed(eventId)) {
          return // 被去重
        }
        handler2CallCount++
      }

      // 標記事件為已處理
      await deduplicator.markProcessed(eventId)

      // 兩個處理器都應跳過
      await handler1(eventId)
      await handler2(eventId)

      expect(handler1CallCount).toBe(0)
      expect(handler2CallCount).toBe(0)
    })
  })

  describe('Retry Scenarios with Deduplication', () => {
    it('應該在重試時防止重複執行', async () => {
      const eventId = uuidv4()
      let executionCount = 0

      const executeWithRetry = async (
        eventId: string,
        maxRetries: number = 3
      ): Promise<boolean> => {
        // 檢查去重
        if (await deduplicator.isProcessed(eventId)) {
          console.log('Event already processed, skipping')
          return false
        }

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            // 模擬可能失敗的操作
            if (attempt < 3) {
              throw new Error('Simulated failure')
            }

            executionCount++
            await deduplicator.markProcessed(eventId)
            return true
          } catch (error) {
            if (attempt === maxRetries) {
              throw error
            }
            // 重試
          }
        }
        return false
      }

      // 第一次執行（第 3 次重試成功）
      const result1 = await executeWithRetry(eventId)
      expect(result1).toBe(true)
      expect(executionCount).toBe(1)

      // 第二次呼叫（應被去重）
      const result2 = await executeWithRetry(eventId)
      expect(result2).toBe(false)
      expect(executionCount).toBe(1) // 未增加
    })

    it('應該在高可用性設置中去重', async () => {
      const eventId = uuidv4()
      let nodeAProcessCount = 0
      let nodeBProcessCount = 0

      // 模擬共享去重器（分散式場景）
      const sharedDeduplicator = deduplicator

      const processOnNode = async (nodeId: 'A' | 'B') => {
        const isDuplicate = await sharedDeduplicator.isProcessed(eventId)
        if (isDuplicate) {
          return { status: 'skipped', node: nodeId }
        }

        // 節點 A 或 B 的處理邏輯
        if (nodeId === 'A') {
          nodeAProcessCount++
        } else {
          nodeBProcessCount++
        }

        await sharedDeduplicator.markProcessed(eventId)
        return { status: 'processed', node: nodeId }
      }

      // 節點 A 先處理
      const resultA = await processOnNode('A')
      expect(resultA.status).toBe('processed')
      expect(nodeAProcessCount).toBe(1)

      // 節點 B 同時/稍後嘗試（應被去重）
      const resultB = await processOnNode('B')
      expect(resultB.status).toBe('skipped')
      expect(nodeBProcessCount).toBe(0) // 未執行

      expect(await sharedDeduplicator.getProcessedCount()).toBe(1)
    })
  })

  describe('Saga Deduplication', () => {
    it('應該在 Saga 步驟中實現冪等性', async () => {
      const sagaId = uuidv4()
      const step1EventId = uuidv4()
      const step2EventId = uuidv4()
      const step3EventId = uuidv4()

      let step1Count = 0
      let step2Count = 0
      let step3Count = 0

      const executeStep = async (
        stepEventId: string,
        stepName: string,
        executor: () => Promise<void>
      ) => {
        const isDuplicate = await deduplicator.isProcessed(stepEventId)
        if (isDuplicate) {
          console.log(`${stepName} already executed (idempotent)`)
          return false
        }

        try {
          await executor()
          await deduplicator.markProcessed(stepEventId)
          return true
        } catch (error) {
          // 補償邏輯在外部處理
          throw error
        }
      }

      // Saga 正向執行
      await executeStep(step1EventId, 'CreateOrder', async () => {
        step1Count++
      })
      await executeStep(step2EventId, 'InitiatePayment', async () => {
        step2Count++
      })
      await executeStep(step3EventId, 'UpdateInventory', async () => {
        step3Count++
      })

      expect(step1Count).toBe(1)
      expect(step2Count).toBe(1)
      expect(step3Count).toBe(1)

      // 重新執行（模擬重試或恢復）
      const retryStep1 = await executeStep(step1EventId, 'CreateOrder', async () => {
        step1Count++ // 不應執行
      })
      expect(retryStep1).toBe(false)
      expect(step1Count).toBe(1) // 保持不變

      // 所有步驟都應保持冪等
      expect(await deduplicator.getProcessedCount()).toBe(3)
    })

    it('應該在 Saga 補償中使用相同的去重狀態', async () => {
      const compensationEventId = uuidv4()
      let compensationExecuted = false

      // Saga 正向執行
      await deduplicator.markProcessed(compensationEventId)

      // Saga 需要補償
      const shouldCompensate = async (eventId: string) => {
        // 檢查是否已補償過
        return !(await deduplicator.isProcessed(eventId))
      }

      // 檢查是否需要補償（應為 false，因為已標記）
      const needsCompensation = await shouldCompensate(compensationEventId)
      expect(needsCompensation).toBe(false)

      // 不應執行補償
      if (needsCompensation) {
        compensationExecuted = true
      }
      expect(compensationExecuted).toBe(false)
    })
  })

  describe('Idempotency with Different Event Versions', () => {
    it('應該為相同 eventId 的不同版本去重', async () => {
      const eventId = uuidv4()
      let processedVersions: number[] = []

      const processEventWithVersion = async (eventId: string, version: number) => {
        const isDuplicate = await deduplicator.isProcessed(eventId)
        if (isDuplicate) {
          return { skipped: true }
        }

        processedVersions.push(version)
        await deduplicator.markProcessed(eventId)
        return { processed: true, version }
      }

      // 版本 1
      const result1 = await processEventWithVersion(eventId, 1)
      expect(result1.processed).toBe(true)
      expect(processedVersions).toEqual([1])

      // 版本 2 重傳（相同 eventId，應被去重）
      const result2 = await processEventWithVersion(eventId, 2)
      expect(result2.skipped).toBe(true)
      expect(processedVersions).toEqual([1]) // 版本 2 未被處理
    })
  })

  describe('Deduplication with Event Batches', () => {
    it('應該在批量事件中進行去重', async () => {
      const eventIds = [uuidv4(), uuidv4(), uuidv4()]
      let processedCount = 0

      const processBatch = async (eventIds: string[]) => {
        for (const eventId of eventIds) {
          if (!(await deduplicator.isProcessed(eventId))) {
            processedCount++
            await deduplicator.markProcessed(eventId)
          }
        }
      }

      // 第一批
      await processBatch(eventIds)
      expect(processedCount).toBe(3)

      // 第二批（包含重複）
      const mixedBatch = [eventIds[0]!, uuidv4(), eventIds[1]!]
      await processBatch(mixedBatch)
      expect(processedCount).toBe(4) // 只新增 1 個（新事件）

      // 完全相同的批次
      await processBatch(eventIds)
      expect(processedCount).toBe(4) // 無增加
    })
  })

  describe('Deduplication State Management', () => {
    it('應該支持去重狀態的查詢和清理', async () => {
      const eventIds = [uuidv4(), uuidv4(), uuidv4()]

      // 標記事件
      for (const id of eventIds) {
        await deduplicator.markProcessed(id)
      }

      // 查詢狀態
      const processedCount = await deduplicator.getProcessedCount()
      expect(processedCount).toBe(3)

      const processedList = await deduplicator.listProcessedEventIds()
      expect(processedList.length).toBe(3)

      // 選擇性清理
      await deduplicator.remove(eventIds[0]!)
      const newCount = await deduplicator.getProcessedCount()
      expect(newCount).toBe(2)

      // 完全清理
      await deduplicator.clear()
      const finalCount = await deduplicator.getProcessedCount()
      expect(finalCount).toBe(0)
    })
  })

  describe('Performance Impact', () => {
    it('應該支持大規模事件流的去重', async () => {
      const eventCount = 10000
      const eventIds = Array.from({ length: eventCount }, () => uuidv4())

      // 標記所有事件
      for (const id of eventIds) {
        await deduplicator.markProcessed(id)
      }

      expect(await deduplicator.getProcessedCount()).toBe(eventCount)

      // 驗證隨機事件的去重
      const randomIndices = [0, 100, 5000, 9999]
      for (const idx of randomIndices) {
        expect(await deduplicator.isProcessed(eventIds[idx]!)).toBe(true)
      }

      // 驗證不存在的事件
      expect(await deduplicator.isProcessed(uuidv4())).toBe(false)
    })
  })
})
