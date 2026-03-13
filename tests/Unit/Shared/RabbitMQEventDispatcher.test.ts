/**
 * RabbitMQEventDispatcher 測試
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RabbitMQEventDispatcher } from '@/Shared/Infrastructure/Events/Dispatchers/RabbitMQEventDispatcher'
import type { IRabbitMQService } from '@/Shared/Infrastructure/Ports/Messaging/IRabbitMQService'
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

// Mock DomainEvent
class TestEvent extends (DomainEvent as any) {
  constructor() {
    super('agg-1', 'TestEvent', {}, 1)
    this.aggregateType = 'User'
  }

  toJSON() {
    return {
      eventId: this.eventId,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      eventType: this.eventType,
      data: this.data,
      version: this.version,
    }
  }
}

describe('RabbitMQEventDispatcher', () => {
  let dispatcher: RabbitMQEventDispatcher
  let mockRabbitMQ: any

  beforeEach(() => {
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
    dispatcher = new RabbitMQEventDispatcher(mockRabbitMQ as IRabbitMQService)
  })

  describe('dispatch', () => {
    it('應該將事件發佈到 gravito.domain.events exchange', async () => {
      const event = new TestEvent()

      await dispatcher.dispatch(event)

      expect(mockRabbitMQ.publish).toHaveBeenCalledWith(
        'gravito.domain.events',
        'User.TestEvent',
        expect.objectContaining({
          name: 'TestEvent',
          event: expect.any(Object),
          timestamp: expect.any(String),
        })
      )
    })

    it('應該支援多個事件批次發佈', async () => {
      const events = [new TestEvent(), new TestEvent()]

      await dispatcher.dispatch(events)

      expect(mockRabbitMQ.publish).toHaveBeenCalledTimes(2)
    })

    it('若 RabbitMQ publish 失敗應拋出錯誤', async () => {
      mockRabbitMQ.publish.mockRejectedValueOnce(new Error('Connection failed'))

      const event = new TestEvent()

      await expect(dispatcher.dispatch(event)).rejects.toThrow('Connection failed')
    })
  })

  describe('subscribe', () => {
    it('應該註冊事件處理器', () => {
      const handler = vi.fn()

      dispatcher.subscribe('TestEvent', handler)

      expect(handler).not.toHaveBeenCalled() // 訂閱不應立即呼叫
    })

    it('應該支援多個處理器訂閱同一事件', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      dispatcher.subscribe('TestEvent', handler1)
      dispatcher.subscribe('TestEvent', handler2)

      await dispatcher.executeHandlers('TestEvent', { data: 'test' })

      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })
  })

  describe('executeHandlers', () => {
    it('應該執行已訂閱的處理器', async () => {
      const handler = vi.fn()
      dispatcher.subscribe('TestEvent', handler)

      const eventData = { id: '1', name: 'Test' }
      await dispatcher.executeHandlers('TestEvent', eventData)

      expect(handler).toHaveBeenCalledWith(eventData)
    })

    it('應該繼續執行其他處理器即使某個失敗', async () => {
      const handler1 = vi.fn().mockRejectedValueOnce(new Error('Handler error'))
      const handler2 = vi.fn()

      dispatcher.subscribe('TestEvent', handler1)
      dispatcher.subscribe('TestEvent', handler2)

      await dispatcher.executeHandlers('TestEvent', { data: 'test' })

      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })

    it('若沒有註冊處理器應安全完成', async () => {
      const result = await dispatcher.executeHandlers('UnknownEvent', {})
      expect(result).toBeUndefined()
    })
  })

  describe('startConsuming', () => {
    it('應該為每個訂閱的事件宣告隊列並綁定到 exchange', async () => {
      const handler = vi.fn()
      dispatcher.subscribe('TestEvent', handler)

      await dispatcher.startConsuming()

      expect(mockRabbitMQ.declareQueue).toHaveBeenCalledWith(
        'gravito.events.TestEvent',
        expect.objectContaining({
          durable: true,
          deadLetterExchange: 'gravito.dead.letters',
        })
      )

      expect(mockRabbitMQ.bindQueue).toHaveBeenCalledWith(
        'gravito.events.TestEvent',
        'gravito.domain.events',
        '*.TestEvent'
      )
    })

    it('應該開始從隊列消費消息', async () => {
      const handler = vi.fn()
      dispatcher.subscribe('TestEvent', handler)

      await dispatcher.startConsuming()

      expect(mockRabbitMQ.consume).toHaveBeenCalledWith(
        'gravito.events.TestEvent',
        expect.any(Function)
      )
    })

    it('若 RabbitMQ 未連接應拋出錯誤', async () => {
      mockRabbitMQ.isConnected.mockReturnValueOnce(false)

      await expect(dispatcher.startConsuming()).rejects.toThrow('RabbitMQ not connected')
    })
  })
})
