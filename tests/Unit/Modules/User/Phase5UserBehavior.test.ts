/**
 * @file Phase5UserBehavior.test.ts
 * @description User 聚合根行為擴展 - Phase 5 測試
 *
 * 測試 User.changeName() 和 User.changeEmail() 方法：
 * - 事件發佈機制
 * - 狀態更新
 * - 驗證
 * - 不可變性
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { User } from '@/Modules/User/Domain/Aggregates/User'
import { Email } from '@/Modules/User/Domain/ValueObjects/Email'
import { UserName } from '@/Modules/User/Domain/ValueObjects/UserName'
import { UserNameChanged } from '@/Modules/User/Domain/Events/UserNameChanged'
import { UserEmailChanged } from '@/Modules/User/Domain/Events/UserEmailChanged'

describe('Phase 5: User 聚合根行為擴展', () => {
  let user: User
  let newName: UserName
  let newEmail: Email

  beforeEach(() => {
    // 建立新用戶
    const name = UserName.create('Original Name')
    const email = Email.create('original@test.com')
    user = User.create('user-1', name, email)

    // 清除建立事件
    user.getUncommittedEvents()
    user.markEventsAsCommitted()

    newName = UserName.create('Updated Name')
    newEmail = Email.create('updated@test.com')
  })

  // ============ changeName() 測試 ============

  describe('changeName() - 用戶名稱變更', () => {
    it('應該成功變更名稱並發佈 UserNameChanged 事件', () => {
      user.changeName(newName)

      const events = user.getUncommittedEvents()
      expect(events.length).toBe(1)
      expect(events[0]).toBeInstanceOf(UserNameChanged)
      expect((events[0] as UserNameChanged).newName).toBe('Updated Name')
    })

    it('應該更新用戶的 name 狀態（透過 applyEvent）', () => {
      user.changeName(newName)
      expect(user.name.value).toBe('Updated Name')
    })

    it('如果名稱相同，應該不發佈事件', () => {
      const sameName = UserName.create(user.name.value)
      user.changeName(sameName)

      const events = user.getUncommittedEvents()
      expect(events.length).toBe(0)
    })

    it('應該支持連續變更名稱', () => {
      const name1 = UserName.create('Name 1')
      const name2 = UserName.create('Name 2')

      user.changeName(name1)
      expect(user.getUncommittedEvents().length).toBe(1)
      user.markEventsAsCommitted()

      user.changeName(name2)
      expect(user.getUncommittedEvents().length).toBe(1)
      expect(user.name.value).toBe('Name 2')
    })

    it('應該驗證新名稱的有效性', () => {
      // 名稱驗證由 UserName ValueObject 負責
      expect(() => {
        const invalidName = UserName.create('')
      }).toThrow()
    })

    it('事件應該正確序列化為 JSON', () => {
      user.changeName(newName)
      const event = user.getUncommittedEvents()[0] as UserNameChanged
      const json = event.toJSON()

      expect(json.eventType).toBe('UserNameChanged')
      expect((json.data as any).newName).toBe('Updated Name')
      expect(json.aggregateId).toBe('user-1')
      expect(json.eventId).toBeDefined()
      expect(json.version).toBe(1)
    })
  })

  // ============ changeEmail() 測試 ============

  describe('changeEmail() - 用戶電子郵件變更', () => {
    it('應該成功變更郵件並發佈 UserEmailChanged 事件', () => {
      user.changeEmail(newEmail)

      const events = user.getUncommittedEvents()
      expect(events.length).toBe(1)
      expect(events[0]).toBeInstanceOf(UserEmailChanged)
      expect((events[0] as UserEmailChanged).newEmail).toBe('updated@test.com')
    })

    it('應該更新用戶的 email 狀態（透過 applyEvent）', () => {
      user.changeEmail(newEmail)
      expect(user.email.value).toBe('updated@test.com')
    })

    it('如果郵件相同，應該不發佈事件', () => {
      const sameEmail = Email.create(user.email.value)
      user.changeEmail(sameEmail)

      const events = user.getUncommittedEvents()
      expect(events.length).toBe(0)
    })

    it('應該支持連續變更郵件', () => {
      const email1 = Email.create('email1@test.com')
      const email2 = Email.create('email2@test.com')

      user.changeEmail(email1)
      expect(user.getUncommittedEvents().length).toBe(1)
      user.markEventsAsCommitted()

      user.changeEmail(email2)
      expect(user.getUncommittedEvents().length).toBe(1)
      expect(user.email.value).toBe('email2@test.com')
    })

    it('應該驗證新郵件的有效性', () => {
      // 郵件驗證由 Email ValueObject 負責
      expect(() => {
        const invalidEmail = Email.create('not-an-email')
      }).toThrow()
    })

    it('事件應該正確序列化為 JSON', () => {
      user.changeEmail(newEmail)
      const event = user.getUncommittedEvents()[0] as UserEmailChanged
      const json = event.toJSON()

      expect(json.eventType).toBe('UserEmailChanged')
      expect((json.data as any).newEmail).toBe('updated@test.com')
      expect(json.aggregateId).toBe('user-1')
      expect(json.eventId).toBeDefined()
      expect(json.version).toBe(1)
    })
  })

  // ============ 組合行為測試 ============

  describe('組合行為', () => {
    it('應該支持同時變更名稱和郵件', () => {
      user.changeName(newName)
      const afterNameChange = user.getUncommittedEvents().length
      expect(afterNameChange).toBe(1)

      user.changeEmail(newEmail)
      const afterEmailChange = user.getUncommittedEvents().length
      expect(afterEmailChange).toBe(2)

      expect(user.name.value).toBe('Updated Name')
      expect(user.email.value).toBe('updated@test.com')
    })

    it('事件應該按順序被記錄', () => {
      user.changeName(newName)
      user.changeEmail(newEmail)

      const events = user.getUncommittedEvents()
      expect(events[0]).toBeInstanceOf(UserNameChanged)
      expect(events[1]).toBeInstanceOf(UserEmailChanged)
    })
  })

  // ============ 不可變性測試 ============

  describe('不可變性', () => {
    it('變更後的用戶狀態應該正確反映', () => {
      expect(user.name.value).toBe('Original Name')
      user.changeName(newName)
      expect(user.name.value).toBe('Updated Name')
    })

    it('原始 ValueObject 應該不受影響', () => {
      const originalName = user.name
      user.changeName(newName)

      // 原始 ValueObject 不應改變
      expect(originalName.value).toBe('Original Name')
      // 用戶的名稱應該指向新 ValueObject
      expect(user.name.value).toBe('Updated Name')
    })

    it('事件鏈應該正確記錄', () => {
      user.changeName(newName)
      const events1 = user.getUncommittedEvents()
      const events2 = user.getUncommittedEvents()

      // 應該有相同數量的事件
      expect(events1.length).toBe(events2.length)
      // 事件應該是 UserNameChanged
      expect(events1[0]).toBeInstanceOf(UserNameChanged)
      expect(events2[0]).toBeInstanceOf(UserNameChanged)
    })
  })

  // ============ 事件重放（Event Sourcing）============

  describe('事件重放', () => {
    it('應該透過重放 UserNameChanged 事件重建狀態', () => {
      user.changeName(newName)
      const events = user.getUncommittedEvents()

      // 建立新用戶並重放事件
      const user2 = User.reconstitute('user-1', UserName.create('Original Name'), user.email, user.createdAt)
      user2.applyEvent(events[0])

      expect(user2.name.value).toBe('Updated Name')
    })

    it('應該透過重放 UserEmailChanged 事件重建狀態', () => {
      user.changeEmail(newEmail)
      const events = user.getUncommittedEvents()

      // 建立新用戶並重放事件
      const user2 = User.reconstitute('user-1', user.name, Email.create('original@test.com'), user.createdAt)
      user2.applyEvent(events[0])

      expect(user2.email.value).toBe('updated@test.com')
    })

    it('應該支持多事件重放', () => {
      user.changeName(newName)
      user.changeEmail(newEmail)
      const events = user.getUncommittedEvents()

      // 建立新用戶
      const user2 = User.reconstitute(
        'user-1',
        UserName.create('Original Name'),
        Email.create('original@test.com'),
        user.createdAt
      )

      // 重放所有事件
      events.forEach(event => user2.applyEvent(event))

      expect(user2.name.value).toBe('Updated Name')
      expect(user2.email.value).toBe('updated@test.com')
    })
  })
})
