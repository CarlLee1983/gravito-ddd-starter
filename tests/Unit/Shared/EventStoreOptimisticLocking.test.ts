/**
 * @file EventStoreOptimisticLocking.test.ts
 * @description Event Store 樂觀鎖測試
 *
 * 驗證 IEventStore 實現的樂觀鎖版本控制機制：
 * - 版本檢查在 append 時執行
 * - 版本衝突拋出 EventStoreVersionConflictException
 * - 多個併發操作時正確偵測衝突
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { MemoryEventStore, type StoredEvent } from '@/Foundation/Infrastructure/Database/EventStore'
import { EventStoreVersionConflictException } from '@/Foundation/Application/EventStoreVersionConflictException'

describe('Event Store Optimistic Locking', () => {
  let eventStore: MemoryEventStore

  beforeEach(() => {
    eventStore = new MemoryEventStore()
  })

  describe('getCurrentVersion()', () => {
    it('應該返回 0 當聚合根尚無事件', async () => {
      const version = await eventStore.getCurrentVersion('user-1')
      expect(version).toBe(0)
    })

    it('應該返回最後一個事件的 aggregateVersion', async () => {
      const events: StoredEvent[] = [
        {
          id: 'evt-1',
          eventId: 'domain-evt-1',
          aggregateId: 'user-1',
          aggregateType: 'User',
          eventType: 'UserCreated',
          eventData: '{}',
          eventVersion: 1,
          aggregateVersion: 1,
          occurredAt: new Date().toISOString(),
        },
        {
          id: 'evt-2',
          eventId: 'domain-evt-2',
          aggregateId: 'user-1',
          aggregateType: 'User',
          eventType: 'UserNameChanged',
          eventData: '{}',
          eventVersion: 1,
          aggregateVersion: 2,
          occurredAt: new Date().toISOString(),
        },
      ]

      await eventStore.append(events)

      const version = await eventStore.getCurrentVersion('user-1')
      expect(version).toBe(2)
    })

    it('應該為不同聚合根返回不同的版本', async () => {
      const event1: StoredEvent = {
        id: 'evt-1',
        eventId: 'domain-evt-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        eventType: 'UserCreated',
        eventData: '{}',
        eventVersion: 1,
        aggregateVersion: 1,
        occurredAt: new Date().toISOString(),
      }

      const event2: StoredEvent = {
        id: 'evt-2',
        eventId: 'domain-evt-2',
        aggregateId: 'post-1',
        aggregateType: 'Post',
        eventType: 'PostCreated',
        eventData: '{}',
        eventVersion: 1,
        aggregateVersion: 1,
        occurredAt: new Date().toISOString(),
      }

      await eventStore.append([event1])
      await eventStore.append([event2])

      const version1 = await eventStore.getCurrentVersion('user-1')
      const version2 = await eventStore.getCurrentVersion('post-1')

      expect(version1).toBe(1)
      expect(version2).toBe(1)
    })
  })

  describe('append() with optimistic locking', () => {
    it('應該允許附加事件當版本匹配時', async () => {
      const event1: StoredEvent = {
        id: 'evt-1',
        eventId: 'domain-evt-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        eventType: 'UserCreated',
        eventData: '{}',
        eventVersion: 1,
        aggregateVersion: 1,
        occurredAt: new Date().toISOString(),
      }

      // 初始附加（無版本檢查）
      await eventStore.append([event1])

      // 使用正確版本附加新事件
      const event2: StoredEvent = {
        id: 'evt-2',
        eventId: 'domain-evt-2',
        aggregateId: 'user-1',
        aggregateType: 'User',
        eventType: 'UserNameChanged',
        eventData: '{}',
        eventVersion: 1,
        aggregateVersion: 2,
        occurredAt: new Date().toISOString(),
      }

      await eventStore.append([event2], 'user-1', 1)

      const loaded = await eventStore.loadByAggregateId('user-1')
      expect(loaded.length).toBe(2)
    })

    it('應該拋出異常當版本不匹配時', async () => {
      const event1: StoredEvent = {
        id: 'evt-1',
        eventId: 'domain-evt-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        eventType: 'UserCreated',
        eventData: '{}',
        eventVersion: 1,
        aggregateVersion: 1,
        occurredAt: new Date().toISOString(),
      }

      await eventStore.append([event1])

      const event2: StoredEvent = {
        id: 'evt-2',
        eventId: 'domain-evt-2',
        aggregateId: 'user-1',
        aggregateType: 'User',
        eventType: 'UserNameChanged',
        eventData: '{}',
        eventVersion: 1,
        aggregateVersion: 2,
        occurredAt: new Date().toISOString(),
      }

      // 使用錯誤版本附加（期望版本 0，但實際版本是 1）
      try {
        await eventStore.append([event2], 'user-1', 0)
        expect.unreachable('應該拋出 EventStoreVersionConflictException')
      } catch (error) {
        expect(error).toBeInstanceOf(EventStoreVersionConflictException)
        expect((error as EventStoreVersionConflictException).aggregateId).toBe('user-1')
        expect((error as EventStoreVersionConflictException).expectedVersion).toBe(0)
        expect((error as EventStoreVersionConflictException).currentVersion).toBe(1)
      }
    })

    it('應該拋出異常當期望版本為 0 但事件已存在時', async () => {
      const event1: StoredEvent = {
        id: 'evt-1',
        eventId: 'domain-evt-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        eventType: 'UserCreated',
        eventData: '{}',
        eventVersion: 1,
        aggregateVersion: 1,
        occurredAt: new Date().toISOString(),
      }

      await eventStore.append([event1])

      const event2: StoredEvent = {
        id: 'evt-2',
        eventId: 'domain-evt-2',
        aggregateId: 'user-1',
        aggregateType: 'User',
        eventType: 'UserNameChanged',
        eventData: '{}',
        eventVersion: 1,
        aggregateVersion: 2,
        occurredAt: new Date().toISOString(),
      }

      // 嘗試作為新聚合根附加（期望版本 0）
      try {
        await eventStore.append([event2], 'user-1', 0)
        expect.unreachable('應該拋出 EventStoreVersionConflictException')
      } catch (error) {
        expect(error).toBeInstanceOf(EventStoreVersionConflictException)
      }
    })

    it('應該在版本衝突時不修改事件存儲', async () => {
      const event1: StoredEvent = {
        id: 'evt-1',
        eventId: 'domain-evt-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        eventType: 'UserCreated',
        eventData: '{}',
        eventVersion: 1,
        aggregateVersion: 1,
        occurredAt: new Date().toISOString(),
      }

      await eventStore.append([event1])

      const event2: StoredEvent = {
        id: 'evt-2',
        eventId: 'domain-evt-2',
        aggregateId: 'user-1',
        aggregateType: 'User',
        eventType: 'UserNameChanged',
        eventData: '{}',
        eventVersion: 1,
        aggregateVersion: 2,
        occurredAt: new Date().toISOString(),
      }

      try {
        await eventStore.append([event2], 'user-1', 999)
      } catch {
        // 期望拋出異常
      }

      const loaded = await eventStore.loadByAggregateId('user-1')
      expect(loaded.length).toBe(1) // 只有一個事件（未成功附加第二個）
    })

    it('應該在不指定版本時允許附加事件（向後相容）', async () => {
      const event1: StoredEvent = {
        id: 'evt-1',
        eventId: 'domain-evt-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        eventType: 'UserCreated',
        eventData: '{}',
        eventVersion: 1,
        aggregateVersion: 1,
        occurredAt: new Date().toISOString(),
      }

      // 不指定版本參數進行附加
      await eventStore.append([event1])

      const event2: StoredEvent = {
        id: 'evt-2',
        eventId: 'domain-evt-2',
        aggregateId: 'user-1',
        aggregateType: 'User',
        eventType: 'UserNameChanged',
        eventData: '{}',
        eventVersion: 1,
        aggregateVersion: 2,
        occurredAt: new Date().toISOString(),
      }

      // 也不指定版本參數進行附加
      await eventStore.append([event2])

      const loaded = await eventStore.loadByAggregateId('user-1')
      expect(loaded.length).toBe(2)
    })
  })

  describe('Concurrent event append simulation', () => {
    it('應該正確處理模擬的併發附加操作', async () => {
      const event1: StoredEvent = {
        id: 'evt-1',
        eventId: 'domain-evt-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        eventType: 'UserCreated',
        eventData: '{}',
        eventVersion: 1,
        aggregateVersion: 1,
        occurredAt: new Date().toISOString(),
      }

      await eventStore.append([event1])

      // 模擬兩個併發操作都試圖附加事件
      const event2: StoredEvent = {
        id: 'evt-2',
        eventId: 'domain-evt-2',
        aggregateId: 'user-1',
        aggregateType: 'User',
        eventType: 'UserNameChanged',
        eventData: '{}',
        eventVersion: 1,
        aggregateVersion: 2,
        occurredAt: new Date().toISOString(),
      }

      const event3: StoredEvent = {
        id: 'evt-3',
        eventId: 'domain-evt-3',
        aggregateId: 'user-1',
        aggregateType: 'User',
        eventType: 'UserEmailChanged',
        eventData: '{}',
        eventVersion: 1,
        aggregateVersion: 3,
        occurredAt: new Date().toISOString(),
      }

      // 第一個操作應該成功
      await eventStore.append([event2], 'user-1', 1)

      // 第二個操作應該失敗（版本已變更為 2）
      try {
        await eventStore.append([event3], 'user-1', 1)
        expect.unreachable('應該拋出 EventStoreVersionConflictException')
      } catch (error) {
        expect(error).toBeInstanceOf(EventStoreVersionConflictException)
        expect((error as EventStoreVersionConflictException).currentVersion).toBe(2)
      }

      const loaded = await eventStore.loadByAggregateId('user-1')
      expect(loaded.length).toBe(2) // 只有第一個新事件被附加
    })
  })
})
