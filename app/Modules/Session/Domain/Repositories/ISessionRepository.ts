/**
 * @file ISessionRepository.ts
 * @description Session Repository 介面（Domain 層）
 *
 * 定義 Session 資料持久化的契約，實現與 ORM 無關。
 */

import type { Session } from '../Aggregates/Session'

/**
 * Session Repository 介面
 *
 * Domain 層只知道此介面，不知道底層 ORM 或存儲實現。
 */
export interface ISessionRepository {
  /**
   * 按 ID 查詢 Session
   *
   * @param id - Session ID
   * @returns Promise<Session | null> Session 實體或 null
   */
  findById(id: string): Promise<Session | null>

  /**
   * 按用戶 ID 查詢所有 Session
   *
   * @param userId - 用戶 ID
   * @returns Promise<Session[]> Session 陣列
   */
  findByUserId(userId: string): Promise<Session[]>

  /**
   * 保存 Session（新建或更新）
   *
   * @param session - Session 實體
   * @returns Promise<void>
   */
  save(session: Session): Promise<void>

  /**
   * 刪除 Session
   *
   * @param id - Session ID
   * @returns Promise<void>
   */
  delete(id: string): Promise<void>
}
