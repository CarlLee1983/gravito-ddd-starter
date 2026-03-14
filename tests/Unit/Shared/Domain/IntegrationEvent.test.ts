import { describe, it, expect } from 'bun:test'
import {
  createIntegrationEvent,
  toIntegrationEvent,
  type IntegrationEvent,
} from '@/Foundation/Domain/IntegrationEvent'

/**
 * 測試 IntegrationEvent 的構建和驗證
 */

describe('IntegrationEvent -- 建立事件', () => {
  it('createIntegrationEvent 應產生有效的事件', () => {
    const event = createIntegrationEvent('UserCreated', 'Identity', {
      userId: 'usr-123',
      email: 'user@example.com',
    })

    expect(event.eventType).toBe('UserCreated')
    expect(event.sourceContext).toBe('Identity')
    expect(event.data.userId).toBe('usr-123')
    expect(event.data.email).toBe('user@example.com')
  })

  it('自動產生 eventId (UUID)', () => {
    const event = createIntegrationEvent('UserCreated', 'Identity', {})

    expect(event.eventId).toBeDefined()
    expect(event.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  it('自動設定 occurredAt (ISO 字串)', () => {
    const beforeCreation = new Date().toISOString()
    const event = createIntegrationEvent('UserCreated', 'Identity', {})
    const afterCreation = new Date().toISOString()

    expect(event.occurredAt).toBeDefined()
    // 應該是 ISO 字串格式
    expect(event.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    // 時間應在合理範圍內
    expect(event.occurredAt >= beforeCreation).toBe(true)
    expect(event.occurredAt <= afterCreation).toBe(true)
  })

  it('應支援可選的 aggregateId', () => {
    const event = createIntegrationEvent(
      'UserCreated',
      'Identity',
      { userId: 'usr-123' },
      'usr-123'
    )

    expect(event.aggregateId).toBe('usr-123')
  })

  it('應支援可選的 version', () => {
    const event = createIntegrationEvent(
      'UserCreated',
      'Identity',
      {},
      undefined,
      2
    )

    expect(event.version).toBe(2)
  })

  it('version 預設為 1', () => {
    const event = createIntegrationEvent('UserCreated', 'Identity', {})
    expect(event.version).toBe(1)
  })
})

describe('IntegrationEvent -- 資料型別驗證', () => {
  it('應只允許原始型別在 data 中', () => {
    const event = createIntegrationEvent('UserCreated', 'Identity', {
      stringValue: 'text',
      numberValue: 42,
      booleanValue: true,
      nullValue: null,
    })

    expect(event.data.stringValue).toBe('text')
    expect(event.data.numberValue).toBe(42)
    expect(event.data.booleanValue).toBe(true)
    expect(event.data.nullValue).toBe(null)
  })

  it('toIntegrationEvent 應產生等效的事件', () => {
    const data = { userId: 'usr-123', email: 'test@example.com' }
    const event = toIntegrationEvent('UserCreated', 'Identity', data, 'usr-123')

    expect(event.eventType).toBe('UserCreated')
    expect(event.sourceContext).toBe('Identity')
    expect(event.aggregateId).toBe('usr-123')
    expect(event.data).toEqual(data)
  })
})

describe('IntegrationEvent -- 對比 DomainEvent 的分隔', () => {
  it('IntegrationEvent 只包含序列化安全的資料', () => {
    // 這個測試驗證了設計意圖：IntegrationEvent 應該能完整序列化為 JSON
    const event = createIntegrationEvent('OrderPlaced', 'Order', {
      orderId: 'ord-456',
      amount: 99.99,
      currency: 'USD',
      isUrgent: true,
      metadata: null,
    })

    // 應該能無誤地序列化和反序列化
    const json = JSON.stringify(event)
    const parsed: IntegrationEvent = JSON.parse(json)

    expect(parsed.eventType).toBe('OrderPlaced')
    expect(parsed.data.amount).toBe(99.99)
    expect(parsed.data.isUrgent).toBe(true)
  })

  it('不應包含 Date 物件，只有 ISO 字串', () => {
    const event = createIntegrationEvent('UserCreated', 'Identity', {})

    // occurredAt 應是字串，不是 Date
    expect(typeof event.occurredAt).toBe('string')
    expect(event.occurredAt).not.toBeInstanceOf(Date)
  })
})

describe('IntegrationEvent -- 跨 Context 消費範例', () => {
  it('Post Context 應能消費 Identity Context 的 UserCreated 事件', () => {
    // Identity Context 發佈
    const userCreatedEvent = createIntegrationEvent(
      'UserCreated',
      'Identity',
      {
        userId: 'usr-789',
        email: 'author@example.com',
        name: 'John Doe',
      },
      'usr-789'
    )

    // Post Context 消費
    if (userCreatedEvent.eventType === 'UserCreated') {
      const userId = userCreatedEvent.data.userId as string
      const email = userCreatedEvent.data.email as string

      // Post Context 應能建立「作者設定檔」
      expect(userId).toBe('usr-789')
      expect(email).toBe('author@example.com')
    }
  })

  it('Event 應包含足夠信息讓接收方決定是否處理', () => {
    const event = createIntegrationEvent('PaymentProcessed', 'Payment', {
      orderId: 'ord-123',
      status: 'success',
      amount: 199.99,
    })

    // Order Context 應能根據 orderId 和 status 決定下一步動作
    const shouldUpdateOrder = event.eventType === 'PaymentProcessed'
    const shouldMarkAsComplete = event.data.status === 'success'

    expect(shouldUpdateOrder).toBe(true)
    expect(shouldMarkAsComplete).toBe(true)
  })
})
