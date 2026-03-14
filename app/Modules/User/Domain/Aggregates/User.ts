/**
 * @file User.ts
 * @description 用戶聚合根 (Aggregate Root)
 *
 * 在 DDD 架構中的角色：
 * - 領域層 (Domain Layer)：系統的核心業務邏輯模型。
 * - 職責：封裝用戶的狀態與業務規則，確保資料的一致性與完整性。
 *
 * Phase 2 改造：
 * - 使用 Email 和 UserName ValueObject
 * - 使用 reconstitute() 而非 fromDatabase()
 * - 實作 applyEvent() 處理領域事件
 */

import { AggregateRoot } from '@/Foundation/Domain/AggregateRoot'
import { UserCreated } from '../Events/UserCreated'
import { UserNameChanged } from '../Events/UserNameChanged'
import { UserEmailChanged } from '../Events/UserEmailChanged'
import { Email } from '../ValueObjects/Email'
import { UserName } from '../ValueObjects/UserName'
import type { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 用戶聚合根
 *
 * 在 DDD 中代表用戶業務實體，負責確保用戶資料的完整性和一致性。
 * 所有狀態變更均通過事件驅動，不允許直接修改屬性。
 */
export class User extends AggregateRoot {
  private _name!: UserName
  private _email!: Email
  private _passwordHash?: string
  protected _createdAt!: Date

  /**
   * 私有建構子，強制使用靜態工廠方法建立實體
   * @param id - 用戶唯一識別碼
   * @private
   */
  private constructor(id: string) {
    super(id)
  }

  /**
   * 建立新的用戶聚合根（產生事件）
   *
   * 遵循完全事件驅動模式：不直接設定狀態，而是透過事件驅動所有狀態變更。
   *
   * @param id - 唯一識別碼
   * @param name - 用戶名稱 ValueObject
   * @param email - 用戶電子郵件 ValueObject
   * @returns 新的 User 實體（包含未提交事件）
   */
  static create(id: string, name: UserName, email: Email): User {
    const user = new User(id)
    const createdAt = new Date()

    // ✨ 發佈領域事件 - 所有狀態由 applyEvent() 設定
    user.raiseEvent(new UserCreated(id, name.value, email.value, createdAt))

    return user
  }

  /**
   * 從儲存的資料還原聚合根（無事件）
   *
   * 此工廠方法用於從資料庫載入已存在的聚合根。
   * 不會產生任何事件，因為聚合根已存在且未發生變更。
   *
   * @param id - 用戶唯一識別碼
   * @param name - 用戶名稱 ValueObject
   * @param email - 用戶電子郵件 ValueObject
   * @param createdAt - 建立時間
   * @param passwordHash - 密碼雜湊值（選填，向後相容）
   * @returns 還原後的 User 實體
   */
  static reconstitute(
    id: string,
    name: UserName,
    email: Email,
    createdAt: Date,
    passwordHash?: string
  ): User {
    const user = new User(id)
    user._name = name
    user._email = email
    user._passwordHash = passwordHash
    // 防禦性複製 Date 物件，防止外部代碼修改內部狀態
    user._createdAt = new Date(createdAt.getTime())
    return user
  }

  /**
   * 建立帶密碼的新用戶聚合根
   *
   * @param id - 唯一識別碼
   * @param name - 用戶名稱 ValueObject
   * @param email - 用戶電子郵件 ValueObject
   * @param passwordHash - 密碼雜湊值
   * @returns 新的 User 實體（包含未提交事件）
   */
  static createWithPassword(
    id: string,
    name: UserName,
    email: Email,
    passwordHash: string
  ): User {
    const user = User.create(id, name, email)
    user._passwordHash = passwordHash
    return user
  }

  /**
   * 實作 AggregateRoot 的抽象方法：定義事件如何影響狀態
   *
   * 當載入聚合根的歷史事件時，應用事件來重建狀態。
   * 所有狀態變更完全由事件驅動，確保 Event Sourcing 的完整性。
   */
  applyEvent(event: DomainEvent): void {
    if (event instanceof UserCreated) {
      this._name = UserName.create(event.name)
      this._email = Email.create(event.email)
      // 防禦性複製 Date 物件，防止外部代碼修改內部狀態
      this._createdAt = new Date(event.createdAt.getTime())
    } else if (event instanceof UserNameChanged) {
      this._name = UserName.create(event.newName)
    } else if (event instanceof UserEmailChanged) {
      this._email = Email.create(event.newEmail)
    }
  }

  // ============ 行為方法（發佈事件） ============

  /**
   * 變更用戶名稱
   *
   * 驗證新名稱有效性，發佈 UserNameChanged 事件。
   * 實際的狀態變更由 applyEvent() 處理。
   *
   * @param newName - 新的用戶名稱 ValueObject
   * @throws Error 如果名稱驗證失敗
   */
  changeName(newName: UserName): void {
    // 如果名稱相同，無需發佈事件
    if (this._name.equals(newName)) {
      return
    }

    // 發佈事件 - applyEvent() 會更新 _name
    this.raiseEvent(new UserNameChanged(this.id, newName.value))
  }

  /**
   * 變更用戶電子郵件
   *
   * 驗證新郵件有效性，發佈 UserEmailChanged 事件。
   * 實際的狀態變更由 applyEvent() 處理。
   *
   * @param newEmail - 新的電子郵件 ValueObject
   * @throws Error 如果郵件驗證失敗
   */
  changeEmail(newEmail: Email): void {
    // 如果郵件相同，無需發佈事件
    if (this._email.equals(newEmail)) {
      return
    }

    // 發佈事件 - applyEvent() 會更新 _email
    this.raiseEvent(new UserEmailChanged(this.id, newEmail.value))
  }

  /**
   * 驗證原文密碼
   *
   * @param plain - 原文密碼
   * @returns Promise<boolean> 是否匹配
   */
  async verifyPassword(plain: string): Promise<boolean> {
    if (!this._passwordHash) return false
    return await Bun.password.verify(plain, this._passwordHash)
  }

  // ============ Getters （只讀屬性） ============

  /** 取得用戶名稱 ValueObject */
  get name(): UserName {
    return this._name
  }

  /** 取得用戶電子郵件 ValueObject */
  get email(): Email {
    return this._email
  }

  /** 取得密碼雜湊值（供 Repository 保存） */
  get passwordHash(): string | undefined {
    return this._passwordHash
  }

  /** 取得建立時間 */
  get createdAt(): Date {
    return new Date(this._createdAt.getTime())
  }
}
