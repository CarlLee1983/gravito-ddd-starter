/**
 * @file Session.ts
 * @description Session 聚合根
 *
 * 代表用戶認證會話。Session 追蹤 JWT Token 的有效期和撤銷狀態。
 */

import { AggregateRoot } from '@/Foundation/Domain/AggregateRoot'
import { SessionCreated } from '../Events/SessionCreated'
import { SessionRevoked } from '../Events/SessionRevoked'
import type { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * Session 聚合根
 *
 * 完全事件驅動，不可變。所有狀態變更由事件驅動。
 */
export class Session extends AggregateRoot {
  private _userId!: string
  private _jwtToken!: string
  private _expiresAt!: Date
  private _revokedAt: Date | null = null
  protected _createdAt!: Date

  /**
   * 私有建構子，強制使用靜態工廠方法
   * @param id - Session ID
   * @private
   */
  private constructor(id: string) {
    super(id)
  }

  /**
   * 建立新的 Session（發佈 SessionCreated 事件）
   *
   * @param id - Session ID
   * @param userId - 用戶 ID
   * @param jwtToken - 已簽發的 JWT Token 字串
   * @param expiresAt - Token 過期時間
   * @returns 新的 Session 實體
   */
  static create(
    id: string,
    userId: string,
    jwtToken: string,
    expiresAt: Date
  ): Session {
    const session = new Session(id)
    const createdAt = new Date()

    session.raiseEvent(
      new SessionCreated(id, userId, jwtToken, expiresAt, createdAt)
    )

    return session
  }

  /**
   * 從儲存的資料還原 Session（無事件）
   *
   * @param id - Session ID
   * @param userId - 用戶 ID
   * @param jwtToken - JWT Token 字串
   * @param expiresAt - 過期時間
   * @param revokedAt - 撤銷時間（null = 未撤銷）
   * @param createdAt - 建立時間
   * @returns 還原後的 Session 實體
   */
  static reconstitute(
    id: string,
    userId: string,
    jwtToken: string,
    expiresAt: Date,
    revokedAt: Date | null,
    createdAt: Date
  ): Session {
    const session = new Session(id)
    session._userId = userId
    session._jwtToken = jwtToken
    session._expiresAt = new Date(expiresAt.getTime())
    session._revokedAt = revokedAt ? new Date(revokedAt.getTime()) : null
    session._createdAt = new Date(createdAt.getTime())
    return session
  }

  /**
   * 實作 AggregateRoot 的抽象方法
   *
   * @param event - 領域事件
   */
  applyEvent(event: DomainEvent): void {
    if (event instanceof SessionCreated) {
      this._userId = event.userId
      this._jwtToken = event.jwtToken
      this._expiresAt = new Date(event.expiresAt.getTime())
      this._createdAt = new Date(event.createdAt.getTime())
      this._revokedAt = null
    } else if (event instanceof SessionRevoked) {
      this._revokedAt = new Date(event.revokedAt.getTime())
    }
  }

  /**
   * 撤銷 Session（登出）
   *
   * 發佈 SessionRevoked 事件，設定 revokedAt 為當前時間。
   */
  revoke(): void {
    if (this._revokedAt !== null) {
      // 已經撤銷，無需再做
      return
    }

    const revokedAt = new Date()
    this.raiseEvent(new SessionRevoked(this.id, this._userId, revokedAt))
  }

  // ============ 查詢方法 ============

  /**
   * 檢查 Token 是否已過期
   *
   * @returns 是否已過期
   */
  get isExpired(): boolean {
    return new Date() > this._expiresAt
  }

  /**
   * 檢查 Session 是否已撤銷
   *
   * @returns 是否已撤銷
   */
  get isRevoked(): boolean {
    return this._revokedAt !== null
  }

  /**
   * 檢查 Session 是否有效（未過期且未撤銷）
   *
   * @returns 是否有效
   */
  get isValid(): boolean {
    return !this.isExpired && !this.isRevoked
  }

  /** 取得用戶 ID */
  get userId(): string {
    return this._userId
  }

  /** 取得 JWT Token */
  get jwtToken(): string {
    return this._jwtToken
  }

  /**
   * 取得過期時間
   *
   * @returns 過期時間 Date 物件
   */
  get expiresAt(): Date {
    return new Date(this._expiresAt.getTime())
  }

  /**
   * 取得撤銷時間（null = 未撤銷）
   *
   * @returns 撤銷時間 Date 物件或 null
   */
  get revokedAt(): Date | null {
    return this._revokedAt ? new Date(this._revokedAt.getTime()) : null
  }

  /**
   * 取得建立時間
   *
   * @returns 建立時間 Date 物件
   */
  get createdAt(): Date {
    return new Date(this._createdAt.getTime())
  }
}
