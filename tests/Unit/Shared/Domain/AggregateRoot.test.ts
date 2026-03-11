import { describe, it, expect } from 'bun:test'
import { AggregateRoot } from '@/Shared/Domain/AggregateRoot'
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * 測試 AggregateRoot 的事件管理能力
 */

// 測試事件
class UserCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly name: string,
    readonly email: string
  ) {
    super(aggregateId, 'UserCreated', { name, email })
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      version: this.version,
      data: this.data,
      name: this.name,
      email: this.email,
    }
  }
}

class UserEmailChangedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly newEmail: string
  ) {
    super(aggregateId, 'UserEmailChanged', { newEmail })
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      version: this.version,
      data: this.data,
      newEmail: this.newEmail,
    }
  }
}

// 測試用的 Aggregate
class UserAggregate extends AggregateRoot {
  private _name: string = ''
  private _email: string = ''

  static create(id: string, name: string, email: string): UserAggregate {
    const user = new UserAggregate(id)
    user.raiseEvent(new UserCreatedEvent(id, name, email))
    return user
  }

  static reconstitute(
    id: string,
    name: string,
    email: string
  ): UserAggregate {
    const user = new UserAggregate(id)
    user._name = name
    user._email = email
    return user
  }

  applyEvent(event: DomainEvent): void {
    if (event instanceof UserCreatedEvent) {
      this._name = event.name
      this._email = event.email
    } else if (event instanceof UserEmailChangedEvent) {
      this._email = event.newEmail
    }
  }

  changeEmail(newEmail: string): void {
    this.raiseEvent(new UserEmailChangedEvent(this.id, newEmail))
  }

  get name(): string {
    return this._name
  }

  get email(): string {
    return this._email
  }
}

describe('AggregateRoot -- 事件產生', () => {
  it('raiseEvent 應追蹤未提交的事件', () => {
    const user = UserAggregate.create('usr-1', 'John', 'john@example.com')

    const events = user.getUncommittedEvents()
    expect(events).toHaveLength(1)
    expect(events[0]).toBeInstanceOf(UserCreatedEvent)
  })

  it('raiseEvent 應立即套用事件到狀態', () => {
    const user = UserAggregate.create('usr-1', 'John', 'john@example.com')

    expect(user.name).toBe('John')
    expect(user.email).toBe('john@example.com')
  })

  it('多個 raiseEvent 應依序追蹤', () => {
    const user = UserAggregate.create('usr-1', 'John', 'john@example.com')
    user.changeEmail('newemail@example.com')

    const events = user.getUncommittedEvents()
    expect(events).toHaveLength(2)
    expect(events[1]).toBeInstanceOf(UserEmailChangedEvent)
  })
})

describe('AggregateRoot -- 事件提交', () => {
  it('markEventsAsCommitted 應清除未提交事件清單', () => {
    const user = UserAggregate.create('usr-1', 'John', 'john@example.com')
    expect(user.getUncommittedEvents()).toHaveLength(1)

    user.markEventsAsCommitted()
    expect(user.getUncommittedEvents()).toHaveLength(0)
  })

  it('markEventsAsCommitted 後狀態應保持不變', () => {
    const user = UserAggregate.create('usr-1', 'John', 'john@example.com')
    user.markEventsAsCommitted()

    expect(user.name).toBe('John')
    expect(user.email).toBe('john@example.com')
  })
})

describe('AggregateRoot -- 事件回放', () => {
  it('loadFromEvents 應從事件流回放狀態', () => {
    const events = [
      new UserCreatedEvent('usr-1', 'John', 'john@example.com'),
      new UserEmailChangedEvent('usr-1', 'john.doe@example.com'),
    ]

    const user = new UserAggregate('usr-1')
    user.loadFromEvents(events)

    expect(user.name).toBe('John')
    expect(user.email).toBe('john.doe@example.com')
  })

  it('loadFromEvents 不應產生未提交事件', () => {
    const events = [
      new UserCreatedEvent('usr-1', 'John', 'john@example.com'),
    ]

    const user = new UserAggregate('usr-1')
    user.loadFromEvents(events)

    expect(user.getUncommittedEvents()).toHaveLength(0)
  })

  it('版本號應基於已套用事件的數量', () => {
    const user = UserAggregate.create('usr-1', 'John', 'john@example.com')
    expect(user.getVersion()).toBe(1)

    user.changeEmail('new@example.com')
    expect(user.getVersion()).toBe(2)

    user.markEventsAsCommitted()
    expect(user.getVersion()).toBe(2) // 版本號不隨提交而變化
  })
})

describe('AggregateRoot -- 重建 vs 建立', () => {
  it('create() 應產生事件，reconstitute() 不應', () => {
    const created = UserAggregate.create('usr-1', 'John', 'john@example.com')
    expect(created.getUncommittedEvents()).toHaveLength(1)

    const reconstituted = UserAggregate.reconstitute(
      'usr-2',
      'Jane',
      'jane@example.com'
    )
    expect(reconstituted.getUncommittedEvents()).toHaveLength(0)
  })

  it('reconstitute 應建立與 loadFromEvents 等價的狀態', () => {
    const events = [
      new UserCreatedEvent('usr-1', 'John', 'john@example.com'),
      new UserEmailChangedEvent('usr-1', 'john.doe@example.com'),
    ]

    const fromEvents = new UserAggregate('usr-1')
    fromEvents.loadFromEvents(events)

    const reconstituted = UserAggregate.reconstitute(
      'usr-1',
      'John',
      'john.doe@example.com'
    )

    expect(fromEvents.email).toBe(reconstituted.email)
  })
})

describe('AggregateRoot -- 不可變事件', () => {
  it('getUncommittedEvents 應回傳新的陣列副本', () => {
    const user = UserAggregate.create('usr-1', 'John', 'john@example.com')
    const events1 = user.getUncommittedEvents()
    const events2 = user.getUncommittedEvents()

    // 應回傳不同的陣列物件
    expect(events1).not.toBe(events2)
    // 但內容應相同
    expect(events1[0]).toBe(events2[0])
  })

  it('無法通過修改陣列副本來修改內部狀態', () => {
    const user = UserAggregate.create('usr-1', 'John', 'john@example.com')
    const events = user.getUncommittedEvents()

    // 嘗試修改副本（模擬外部攻擊）
    ;(events as any).pop()

    // 原來的未提交事件應保持不變
    expect(user.getUncommittedEvents()).toHaveLength(1)
  })
})
