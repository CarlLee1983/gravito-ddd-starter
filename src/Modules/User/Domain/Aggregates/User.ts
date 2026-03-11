/**
 * @file User.ts
 * @description 用戶聚合根 (Aggregate Root)
 *
 * 在 DDD 架構中的角色：
 * - 領域層 (Domain Layer)：系統的核心業務邏輯模型。
 * - 職責：封裝用戶的狀態與業務規則，確保資料的一致性與完整性。
 */

/**
 * 用戶屬性介面
 */
export interface UserProps {
  /** 用戶唯一識別碼 */
  id: string
  /** 用戶名稱 */
  name: string
  /** 用戶電子郵件 */
  email: string
  /** 建立時間 */
  createdAt: Date
}

import { BaseEntity } from '@/Shared/Domain/BaseEntity'

/**
 * 用戶領域實體類別
 */
export class User extends BaseEntity {
  /**
   * 私有建構子，強制使用靜態工廠方法建立實體
   * @param props - 用戶屬性
   * @private
   */
  private constructor(private props: UserProps) {
    super(props.id)
  }

  /**
   * 建立新的用戶實體 (靜態工廠)
   *
   * @param id - 唯一識別碼
   * @param name - 名稱
   * @param email - 電子郵件
   * @returns 新的 User 實體
   */
  static create(id: string, name: string, email: string): User {
    return new User({
      id,
      name,
      email,
      createdAt: new Date(),
    })
  }

  /**
   * 從資料庫原始資料還原實體
   *
   * @param data - 資料庫回傳的純物件
   * @returns 還原後的 User 實體
   */
  static fromDatabase(data: {
    id: string
    name: string
    email: string
    created_at?: string | Date
  }): User {
    return new User({
      id: data.id,
      name: data.name,
      email: data.email,
      createdAt: data.created_at instanceof Date ? data.created_at : new Date(data.created_at || new Date()),
    })
  }

  /** 取得用戶 ID */
  get id(): string {
    return this.props.id
  }

  /** 取得用戶名稱 */
  get name(): string {
    return this.props.name
  }

  /** 取得用戶電子郵件 */
  get email(): string {
    return this.props.email
  }

  /** 取得建立時間 */
  get createdAt(): Date {
    return this.props.createdAt
  }
}
