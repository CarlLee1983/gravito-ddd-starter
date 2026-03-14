/**
 * @file UserReadModel.ts
 * @description 用戶讀取模型 (CQRS Read Model)
 *
 * 職責：定義用於顯示的扁平化用戶資料結構。
 */

/**
 * 用戶讀取模型
 */
export interface UserReadModel {
  /** 用戶唯一識別碼 */
  readonly id: string
  /** 用戶名稱 */
  readonly name: string
  /** 用戶電子郵件 */
  readonly email: string
  /** 建立時間 (ISO 字串) */
  readonly createdAt: string
}
