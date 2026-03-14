/**
 * @file SessionCreated.ts
 * @description Session 建立事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 當新的 Session 被建立時發佈
 */
export class SessionCreated extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly jwtToken: string,
    public readonly expiresAt: Date,
    public readonly createdAt: Date
  ) {
    super(
      sessionId, // aggregateId
      'SessionCreated', // eventType
      {
        sessionId,
        userId,
        jwtToken,
        expiresAt: expiresAt.toISOString(),
        createdAt: createdAt.toISOString(),
      }
    )
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      version: this.version,
      sessionId: this.sessionId,
      userId: this.userId,
      expiresAt: this.expiresAt.toISOString(),
      createdAt: this.createdAt.toISOString(),
    }
  }
}
