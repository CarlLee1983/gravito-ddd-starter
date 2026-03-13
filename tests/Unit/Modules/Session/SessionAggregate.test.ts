/**
 * @file SessionAggregate.test.ts
 * @description Session 聚合根單元測試
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { Session } from '@/Modules/Session/Domain/Aggregates/Session'
import { SessionCreated } from '@/Modules/Session/Domain/Events/SessionCreated'
import { SessionRevoked } from '@/Modules/Session/Domain/Events/SessionRevoked'

describe('Session Aggregate', () => {
  let sessionId: string
  let userId: string
  let jwtToken: string
  let expiresAt: Date

  beforeEach(() => {
    sessionId = crypto.randomUUID()
    userId = crypto.randomUUID()
    jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    expiresAt = new Date(Date.now() + 86400 * 1000) // 24 小時後
  })

  describe('Session.create()', () => {
    it('應建立新的 Session 並發佈 SessionCreated 事件', () => {
      const session = Session.create(sessionId, userId, jwtToken, expiresAt)

      expect(session.id).toBe(sessionId)
      expect(session.userId).toBe(userId)
      expect(session.jwtToken).toBe(jwtToken)
      expect(session.isValid).toBe(true)
      expect(session.isExpired).toBe(false)
      expect(session.isRevoked).toBe(false)

      const events = session.getUncommittedEvents()
      expect(events.length).toBe(1)
      expect(events[0]).toBeInstanceOf(SessionCreated)
    })
  })

  describe('Session.reconstitute()', () => {
    it('應從資料庫記錄還原 Session（無事件）', () => {
      const createdAt = new Date()
      const session = Session.reconstitute(
        sessionId,
        userId,
        jwtToken,
        expiresAt,
        null,
        createdAt
      )

      expect(session.id).toBe(sessionId)
      expect(session.userId).toBe(userId)
      expect(session.isValid).toBe(true)
      expect(session.getUncommittedEvents().length).toBe(0)
    })

    it('應正確還原已撤銷的 Session', () => {
      const createdAt = new Date()
      const revokedAt = new Date()
      const session = Session.reconstitute(
        sessionId,
        userId,
        jwtToken,
        expiresAt,
        revokedAt,
        createdAt
      )

      expect(session.isRevoked).toBe(true)
      expect(session.isValid).toBe(false)
      expect(session.revokedAt).toBeTruthy()
    })
  })

  describe('isExpired', () => {
    it('未過期 Session 應回傳 false', () => {
      const futureTime = new Date(Date.now() + 3600 * 1000)
      const session = Session.create(sessionId, userId, jwtToken, futureTime)

      expect(session.isExpired).toBe(false)
    })

    it('已過期 Session 應回傳 true', () => {
      const pastTime = new Date(Date.now() - 3600 * 1000)
      const session = Session.create(sessionId, userId, jwtToken, pastTime)

      expect(session.isExpired).toBe(true)
    })
  })

  describe('revoke()', () => {
    it('應撤銷 Session 並發佈 SessionRevoked 事件', () => {
      const session = Session.create(sessionId, userId, jwtToken, expiresAt)
      session.markEventsAsCommitted() // 清除 SessionCreated 事件

      session.revoke()

      expect(session.isRevoked).toBe(true)
      expect(session.isValid).toBe(false)

      const events = session.getUncommittedEvents()
      expect(events.length).toBe(1)
      expect(events[0]).toBeInstanceOf(SessionRevoked)
    })

    it('重複撤銷應無效', () => {
      const session = Session.create(sessionId, userId, jwtToken, expiresAt)
      session.markEventsAsCommitted()

      session.revoke()
      const firstRevoke = session.getUncommittedEvents()

      session.markEventsAsCommitted()
      session.revoke()
      const secondRevoke = session.getUncommittedEvents()

      expect(firstRevoke.length).toBe(1)
      expect(secondRevoke.length).toBe(0) // 第二次撤銷無事件
    })
  })

  describe('isValid', () => {
    it('有效 Session 應回傳 true（未過期且未撤銷）', () => {
      const futureTime = new Date(Date.now() + 3600 * 1000)
      const session = Session.create(sessionId, userId, jwtToken, futureTime)

      expect(session.isValid).toBe(true)
    })

    it('過期 Session 應回傳 false', () => {
      const pastTime = new Date(Date.now() - 3600 * 1000)
      const session = Session.create(sessionId, userId, jwtToken, pastTime)

      expect(session.isValid).toBe(false)
    })

    it('已撤銷 Session 應回傳 false', () => {
      const session = Session.create(sessionId, userId, jwtToken, expiresAt)
      session.revoke()

      expect(session.isValid).toBe(false)
    })
  })

  describe('applyEvent()', () => {
    it('應應用 SessionCreated 事件', () => {
      const session = new (Session as any)(sessionId) // 私有建構子
      const event = new SessionCreated(sessionId, userId, jwtToken, expiresAt, new Date())

      session.applyEvent(event)

      expect(session.userId).toBe(userId)
      expect(session.jwtToken).toBe(jwtToken)
    })

    it('應應用 SessionRevoked 事件', () => {
      const session = Session.create(sessionId, userId, jwtToken, expiresAt)
      const revokedAt = new Date()
      const event = new SessionRevoked(sessionId, userId, revokedAt)

      session.applyEvent(event)

      expect(session.isRevoked).toBe(true)
    })
  })
})
