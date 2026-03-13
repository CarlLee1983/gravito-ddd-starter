/**
 * @file IUserProfileService.ts
 * @description 用戶資料查詢 Port 介面
 *
 * 框架無關的用戶資料查詢抽象。
 * User 模組實現此介面以提供用戶資料查詢能力。
 * Session 模組（AuthController.me）透過此介面查詢用戶資料，
 * 而不直接依賴 User 模組的實現細節或 Repository。
 */

/**
 * 用戶資料查詢結果介面
 */
export interface UserProfileResult {
  /** 用戶唯一識別碼 */
  id: string
  /** 用戶名稱 */
  name: string
  /** 用戶電子郵件 */
  email: string
  /** 帳戶建立時間（ISO 8601 格式） */
  createdAt: string
}

/**
 * 用戶資料查詢 Port 介面
 *
 * 此介面定義了「根據用戶 ID 查詢用戶資料」的契約。
 * 實現方（如 User 模組）負責：
 * - 查詢用戶信息
 * - 組織結果格式
 * - 返回用戶資料或 null（用戶不存在）
 *
 * 這是 Session 和 User 兩個 Bounded Context 之間的反腐敗層（Anti-Corruption Layer）。
 * 透過此介面，Session 模組可以查詢用戶資料而無需直接存取 Repository。
 */
export interface IUserProfileService {
  /**
   * 根據用戶 ID 查詢用戶資料
   *
   * @param userId - 用戶唯一識別碼
   * @returns 用戶存在時返回用戶資料；不存在時返回 null
   *
   * @throws 可能拋出與存儲層有關的異常（如資料庫錯誤）
   *
   * @example
   * ```typescript
   * const profile = await userProfileService.findById('user-123')
   * if (profile) {
   *   console.log(`User: ${profile.name} (${profile.email})`)
   * } else {
   *   console.log('User not found')
   * }
   * ```
   */
  findById(userId: string): Promise<UserProfileResult | null>
}
