/**
 * @file IUserCreator.ts
 * @description 用戶建立 Port 介面
 *
 * 框架無關的用戶建立抽象。
 * User 模組實現此介面以提供用戶建立能力。
 * Auth 模組（RegisterService）透過此介面建立新用戶，
 * 而不直接依賴 User 模組的實現細節。
 */

/**
 * 用戶建立結果介面
 */
export interface UserCreationResult {
  /** 新建用戶的 ID */
  id: string
  /** 用戶名稱 */
  name: string
  /** 用戶郵件 */
  email: string
}

/**
 * 用戶建立 Port 介面
 *
 * 此介面定義了「建立新用戶（含密碼）」的契約。
 * 實現方（如 User 模組）負責：
 * - 驗證輸入（郵件格式、密碼強度）
 * - 檢查郵件唯一性
 * - 加密密碼
 * - 建立 User 聚合根
 * - 持久化用戶資訊
 *
 * 這是 Auth 和 User 兩個 Bounded Context 之間的防腐層（Anti-Corruption Layer）。
 * 透過此介面，兩個模組可以獨立演進而無需直接耦合。
 */
export interface IUserCreator {
  /**
   * 建立新用戶（含密碼）
   *
   * @param name - 用戶名稱
   * @param email - 用戶郵件
   * @param password - 用戶密碼（原文）
   * @returns 建立成功時返回 UserCreationResult；重複郵件時返回 null
   *
   * @throws 可能拋出與儲存層有關的異常（如資料庫錯誤）
   *
   * @example
   * ```typescript
   * const result = await userCreator.create('John', 'john@example.com', 'password123')
   * if (result) {
   *   console.log(`User created: ${result.id}`)
   * } else {
   *   console.log('Email already exists')
   * }
   * ```
   */
  create(name: string, email: string, password: string): Promise<UserCreationResult | null>
}
