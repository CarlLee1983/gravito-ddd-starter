/**
 * @file EventStore.test.ts
 * @description Event Store 測試
 *
 * 測試 MemoryEventStore 實現，驗證事件持久化與查詢功能
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { MemoryEventStore, type StoredEvent } from '@/Foundation/Infrastructure/Database/EventStore'

describe('MemoryEventStore', () => {
  let eventStore: MemoryEventStore

  beforeEach(() => {
    eventStore = new MemoryEventStore()
  })

  describe('append()', () => {
    it('應該存儲單個事件', async () => {
      const event: StoredEvent = {
        id: 'evt-1',
        eventId: 'domain-evt-1',
        aggregateId: 'user-1',
        aggregateType: 'User',
        eventType: 'UserCreated',
        eventData: '{"userId":"user-1","name":"Alice"}',
        eventVersion: 1,
        aggregateVersion: 1,
        occurredAt: new Date().toISOString(),
      }

      await eventStore.append([event])

      const loaded = await eventStore.loadByAggregateId('user-1')
      expect(loaded.length).toBe(1)
      expect(loaded[0].eventId).toBe('domain-evt-1')
    })

    it('應該存儲多個事件', async () => {
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

      const loaded = await eventStore.loadByAggregateId('user-1')
      expect(loaded.length).toBe(2)
      expect(loaded[0].aggregateVersion).toBe(1)
      expect(loaded[1].aggregateVersion).toBe(2)
    })
  })

  describe('loadByAggregateId()', () => {
    beforeEach(async () => {
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
        {
          id: 'evt-3',
          eventId: 'domain-evt-3',
          aggregateId: 'user-2',
          aggregateType: 'User',
          eventType: 'UserCreated',
          eventData: '{}',
          eventVersion: 1,
          aggregateVersion: 1,
          occurredAt: new Date().toISOString(),
        },
      ]

      await eventStore.append(events)
    })

    it('應該查詢特定聚合根的所有事件', async () => {
      const loaded = await eventStore.loadByAggregateId('user-1')
      expect(loaded.length).toBe(2)
      expect(loaded.every(e => e.aggregateId === 'user-1')).toBe(true)
    })

    it('應該根據 aggregateType 篩選事件', async () => {
      const loaded = await eventStore.loadByAggregateId('user-1', 'User')
      expect(loaded.length).toBe(2)
      expect(loaded.every(e => e.aggregateType === 'User')).toBe(true)
    })

    it('應該根據 fromVersion 篩選事件', async () => {
      const loaded = await eventStore.loadByAggregateId('user-1', undefined, 2)
      expect(loaded.length).toBe(1)
      expect(loaded[0].aggregateVersion).toBe(2)
    })

    it('不存在的聚合根應回傳空陣列', async () => {
      const loaded = await eventStore.loadByAggregateId('non-existent')
      expect(loaded.length).toBe(0)
    })
  })

  describe('loadByEventType()', () => {
    beforeEach(async () => {
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
        {
          id: 'evt-3',
          eventId: 'domain-evt-3',
          aggregateId: 'user-2',
          aggregateType: 'User',
          eventType: 'UserCreated',
          eventData: '{}',
          eventVersion: 1,
          aggregateVersion: 1,
          occurredAt: new Date().toISOString(),
        },
      ]

      await eventStore.append(events)
    })

    it('應該查詢特定事件類型的所有事件', async () => {
      const loaded = await eventStore.loadByEventType('UserCreated')
      expect(loaded.length).toBe(2)
      expect(loaded.every(e => e.eventType === 'UserCreated')).toBe(true)
    })

    it('不存在的事件類型應回傳空陣列', async () => {
      const loaded = await eventStore.loadByEventType('NonExistentEvent')
      expect(loaded.length).toBe(0)
    })
  })

  describe('countByAggregateId()', () => {
    beforeEach(async () => {
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
    })

    it('應該計算特定聚合根的事件總數', async () => {
      const count = await eventStore.countByAggregateId('user-1')
      expect(count).toBe(2)
    })

    it('不存在的聚合根應回傳 0', async () => {
      const count = await eventStore.countByAggregateId('non-existent')
      expect(count).toBe(0)
    })
  })
})
