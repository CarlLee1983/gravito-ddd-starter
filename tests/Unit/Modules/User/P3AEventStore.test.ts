/**
 * @file P3AEventStore.test.ts
 * @description User Repository 事件存儲測試 (P3A)
 *
 * 驗證 UserRepository 保存事件到 EventStore
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { UserRepository } from '@/Modules/User/Infrastructure/Persistence/UserRepository'
import { User } from '@/Modules/User/Domain/Aggregates/User'
import { Email } from '@/Modules/User/Domain/ValueObjects/Email'
import { UserName } from '@/Modules/User/Domain/ValueObjects/UserName'
import { MemoryEventStore } from '@/Foundation/Infrastructure/Database/EventStore'
import { MemoryDatabaseAccess } from '@/Foundation/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'

describe('User Repository - EventStore Integration (P3A)', () => {
  let repository: UserRepository
  let eventStore: MemoryEventStore
  let db: MemoryDatabaseAccess

  beforeEach(() => {
    db = new MemoryDatabaseAccess()
    eventStore = new MemoryEventStore()
    repository = new UserRepository(db, undefined, eventStore)
  })

  describe('save() with EventStore', () => {
    it('應該在保存時將事件追加到 EventStore', async () => {
      const user = User.create('user-1', UserName.create('Alice'), Email.create('alice@example.com'))

      await repository.save(user)

      const storedEvents = await eventStore.loadByAggregateId('user-1', 'User')
      expect(storedEvents.length).toBeGreaterThan(0)
      expect(storedEvents[0].aggregateType).toBe('User')
      expect(storedEvents[0].aggregateVersion).toBe(1)
    })

    it('應該正確序列化事件資料', async () => {
      const user = User.create('user-1', UserName.create('Alice'), Email.create('alice@example.com'))

      await repository.save(user)

      const storedEvents = await eventStore.loadByAggregateId('user-1')
      expect(storedEvents.length).toBeGreaterThan(0)

      const eventData = JSON.parse(storedEvents[0].eventData)
      expect(eventData).toHaveProperty('aggregateId')
      expect(eventData).toHaveProperty('data')
      expect(eventData.data).toHaveProperty('name')
      expect(eventData.data).toHaveProperty('email')
    })

    it('應該遞增事件的 aggregateVersion', async () => {
      const user = User.create('user-1', UserName.create('Alice'), Email.create('alice@example.com'))
      await repository.save(user)

      // 載入並修改
      const loaded = await repository.findById('user-1')
      expect(loaded).not.toBeNull()

      if (loaded) {
        loaded.changeName(UserName.create('Alice Updated'))
        await repository.save(loaded)
      }

      const storedEvents = await eventStore.loadByAggregateId('user-1')
      // 應該有多個事件，且版本遞增
      const versions = storedEvents.map(e => e.aggregateVersion).sort((a, b) => a - b)
      for (let i = 0; i < versions.length; i++) {
        expect(versions[i]).toBe(i + 1)
      }
    })

    it('新建用戶的第一個事件版本應為 1', async () => {
      const user = User.create('user-1', UserName.create('Alice'), Email.create('alice@example.com'))

      await repository.save(user)

      const storedEvents = await eventStore.loadByAggregateId('user-1')
      expect(storedEvents[0].aggregateVersion).toBe(1)
    })

    it('應該儲存正確的事件類型名稱', async () => {
      const user = User.create('user-1', UserName.create('Alice'), Email.create('alice@example.com'))

      await repository.save(user)

      const storedEvents = await eventStore.loadByAggregateId('user-1')
      expect(storedEvents[0].eventType).toBe('UserCreated')
    })

    it('應該包含 eventId 和 occurredAt', async () => {
      const user = User.create('user-1', UserName.create('Alice'), Email.create('alice@example.com'))

      await repository.save(user)

      const storedEvents = await eventStore.loadByAggregateId('user-1')
      expect(storedEvents[0].eventId).toBeDefined()
      expect(storedEvents[0].occurredAt).toBeDefined()
    })
  })

  describe('eventCount consistency', () => {
    it('EventStore 計數應與事件列表長度一致', async () => {
      const user = User.create('user-1', UserName.create('Alice'), Email.create('alice@example.com'))
      await repository.save(user)

      const count = await eventStore.countByAggregateId('user-1')
      const events = await eventStore.loadByAggregateId('user-1')

      expect(count).toBe(events.length)
    })
  })
})
