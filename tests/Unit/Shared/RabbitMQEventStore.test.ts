/**
 * RabbitMQEventStore 測試
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RabbitMQEventStore } from '@/Shared/Infrastructure/Database/EventStore/RabbitMQEventStore'
import type { IEventStore, StoredEvent } from '@/Shared/Infrastructure/IEventStore'
import type { IRabbitMQService } from '@/Shared/Infrastructure/IRabbitMQService'

// Mock StoredEvent
const createMockStoredEvent = (eventType: string = 'UserCreated'): StoredEvent => ({
  id: 'evt-1',
  eventId: 'event-id-1',
  aggregateId: 'user-1',
  aggregateType: 'User',
  eventType,
  eventData: JSON.stringify({ userId: 'user-1', email: 'test@example.com' }),
  eventVersion: 1,
  aggregateVersion: 1,
  occurredAt: new Date().toISOString(),
})

describe('RabbitMQEventStore', () => {
  let eventStore: RabbitMQEventStore
  let mockInner: any
  let mockRabbitMQ: any

  beforeEach(() => {
    mockInner = {
      append: vi.fn(),
      loadByAggregateId: vi.fn(),
      loadByEventType: vi.fn(),
      countByAggregateId: vi.fn(),
    }

    mockRabbitMQ = {
      connect: vi.fn(),
      close: vi.fn(),
      isConnected: vi.fn(() => true),
      publish: vi.fn(),
      consume: vi.fn(),
      declareExchange: vi.fn(),
      declareQueue: vi.fn(),
      bindQueue: vi.fn(),
    }

    eventStore = new RabbitMQEventStore(
      mockInner as IEventStore,
      mockRabbitMQ as IRabbitMQService
    )
  })

  describe('append', () => {
    it('應該先呼叫內部 EventStore.append()', async () => {
      const events = [createMockStoredEvent()]

      await eventStore.append(events)

      expect(mockInner.append).toHaveBeenCalledWith(events)
    })

    it('應該在內部 append 後發佈整合事件到 RabbitMQ', async () => {
      const events = [createMockStoredEvent('UserCreated')]

      await eventStore.append(events)

      expect(mockRabbitMQ.publish).toHaveBeenCalledWith(
        'gravito.integration.events',
        'User.UserCreated',
        expect.objectContaining({
          id: 'event-id-1',
          aggregateId: 'user-1',
          aggregateType: 'User',
          eventType: 'UserCreated',
          sourceContext: 'gravito-ddd',
        })
      )
    })

    it('應該支援多個事件的批次發佈', async () => {
      const events = [
        createMockStoredEvent('UserCreated'),
        createMockStoredEvent('UserNameChanged'),
      ]

      await eventStore.append(events)

      expect(mockRabbitMQ.publish).toHaveBeenCalledTimes(2)
    })

    it('若內部 append 失敗應拋出錯誤且不發佈到 RabbitMQ', async () => {
      const events = [createMockStoredEvent()]
      mockInner.append.mockRejectedValueOnce(new Error('Store error'))

      await expect(eventStore.append(events)).rejects.toThrow('Store error')
      expect(mockRabbitMQ.publish).not.toHaveBeenCalled()
    })

    it('若 RabbitMQ 斷線應記錄警告但不拋出錯誤', async () => {
      mockRabbitMQ.isConnected.mockReturnValueOnce(false)
      const events = [createMockStoredEvent()]

      const result = await eventStore.append(events)

      expect(result).toBeUndefined()
      expect(mockInner.append).toHaveBeenCalled()
      expect(mockRabbitMQ.publish).not.toHaveBeenCalled()
    })

    it('若 RabbitMQ publish 失敗應記錄錯誤但不拋出異常', async () => {
      mockRabbitMQ.publish.mockRejectedValueOnce(new Error('Publish failed'))
      const events = [createMockStoredEvent()]

      const result = await eventStore.append(events)

      expect(result).toBeUndefined()
      expect(mockInner.append).toHaveBeenCalled()
    })

    it('應該正確序列化事件數據', async () => {
      const events = [createMockStoredEvent()]

      await eventStore.append(events)

      const publishCall = mockRabbitMQ.publish.mock.calls[0]
      const publishedMessage = publishCall[2]

      expect(publishedMessage.eventData).toEqual({
        userId: 'user-1',
        email: 'test@example.com',
      })
    })
  })

  describe('loadByAggregateId', () => {
    it('應該代理到內部 EventStore', async () => {
      const mockEvents = [createMockStoredEvent()]
      mockInner.loadByAggregateId.mockResolvedValueOnce(mockEvents)

      const result = await eventStore.loadByAggregateId('user-1', 'User', 1)

      expect(mockInner.loadByAggregateId).toHaveBeenCalledWith('user-1', 'User', 1)
      expect(result).toEqual(mockEvents)
    })
  })

  describe('loadByEventType', () => {
    it('應該代理到內部 EventStore', async () => {
      const mockEvents = [createMockStoredEvent('UserCreated')]
      mockInner.loadByEventType.mockResolvedValueOnce(mockEvents)

      const result = await eventStore.loadByEventType('UserCreated')

      expect(mockInner.loadByEventType).toHaveBeenCalledWith('UserCreated')
      expect(result).toEqual(mockEvents)
    })
  })

  describe('countByAggregateId', () => {
    it('應該代理到內部 EventStore', async () => {
      mockInner.countByAggregateId.mockResolvedValueOnce(5)

      const result = await eventStore.countByAggregateId('user-1')

      expect(mockInner.countByAggregateId).toHaveBeenCalledWith('user-1')
      expect(result).toBe(5)
    })
  })
})
