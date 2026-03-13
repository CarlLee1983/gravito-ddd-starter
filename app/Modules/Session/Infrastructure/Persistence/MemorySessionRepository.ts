/**
 * @file MemorySessionRepository.ts
 * @description Session 記憶體倉儲實現
 *
 * 簡單的記憶體實現，用於開發和測試。
 * 未來可替換為 Redis 實現。
 */

import type { ISessionRepository } from '../../Domain/Repositories/ISessionRepository'
import type { Session } from '../../Domain/Aggregates/Session'
import type { IEventDispatcher } from '@/Shared/Infrastructure/Ports/Messaging/IEventDispatcher'

/**
 * Session 記憶體倉儲
 *
 * 不需要繼承 BaseEventSourcedRepository，因為使用記憶體存儲。
 * 簡單地維護 Map<sessionId, Session>。
 */
export class MemorySessionRepository implements ISessionRepository {
  private sessions: Map<string, Session> = new Map()

  /**
   * 建構子
   *
   * @param eventDispatcher - 事件分發器（用於分派領域事件）
   */
  constructor(private eventDispatcher?: IEventDispatcher) {}

  /**
   * 按 ID 查詢 Session
   *
   * @param id - Session ID
   * @returns Promise<Session | null>
   */
  async findById(id: string): Promise<Session | null> {
    const session = this.sessions.get(id)
    return session ?? null
  }

  /**
   * 按用戶 ID 查詢所有 Session
   *
   * @param userId - 用戶 ID
   * @returns Promise<Session[]>
   */
  async findByUserId(userId: string): Promise<Session[]> {
    const sessions: Session[] = []
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        sessions.push(session)
      }
    }
    return sessions
  }

  /**
   * 保存 Session
   *
   * @param session - Session 實體
   * @returns Promise<void>
   */
  async save(session: Session): Promise<void> {
    this.sessions.set(session.id, session)

    // 分派未提交的領域事件
    if (this.eventDispatcher) {
      const events = session.getUncommittedEvents()
      if (events.length > 0) {
        await this.eventDispatcher.dispatch([...events])
        session.markEventsAsCommitted()
      }
    }
  }

  /**
   * 刪除 Session
   *
   * @param id - Session ID
   * @returns Promise<void>
   */
  async delete(id: string): Promise<void> {
    this.sessions.delete(id)
  }

  /**
   * 清空所有 Session（用於測試）
   *
   * @returns Promise<void>
   */
  async clear(): Promise<void> {
    this.sessions.clear()
  }

  /**
   * 取得所有 Session（用於測試）
   *
   * @returns Session[]
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values())
  }
}
