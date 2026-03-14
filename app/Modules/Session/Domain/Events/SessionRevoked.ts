/**
 * @file SessionRevoked.ts
 * @description Session 撤銷事件
 */

import { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 當 Session 被撤銷（登出）時發佈
 */
export class SessionRevoked extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly revokedAt: Date
  ) {
    super(
      sessionId, // aggregateId
      'SessionRevoked', // eventType
      {
        sessionId,
        userId,
        revokedAt: revokedAt.toISOString(),
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
      revokedAt: this.revokedAt.toISOString(),
    }
  }
}
