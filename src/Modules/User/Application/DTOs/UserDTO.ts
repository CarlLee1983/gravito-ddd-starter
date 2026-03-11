/**
 * @file UserDTO.ts
 * @description 用戶資料傳輸物件 (Data Transfer Object)
 *
 * 在 DDD 架構中的角色：
 * - 應用層 (Application Layer)：作為 Presentation 層與 Application 層之間交換資料的契約。
 * - 職責：封裝從領域實體 (Domain Entity) 轉換而來的資料，確保不會將領域邏輯洩露到外部。
 */

/**
 * 用戶資料傳輸物件介面
 */
export interface UserDTO {
  /** 用戶唯一識別碼 */
  id: string
  /** 用戶名稱 */
  name: string
  /** 用戶電子郵件 */
  email: string
  /** 建立時間 (ISO 格式字串) */
  createdAt: string
}
