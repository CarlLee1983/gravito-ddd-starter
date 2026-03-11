/**
 * @file UserDTO.ts
 * @description 用戶資料傳輸物件 (Data Transfer Object)
 *
 * 在 DDD 架構中的角色：
 * - 應用層 (Application Layer)：作為 Presentation 層與 Application 層之間交換資料的契約。
 * - 職責：封裝從領域實體 (Domain Entity) 轉換而來的資料，確保不會將領域邏輯洩露到外部。
 *
 * Phase 2 改造：
 * - 從領域聚合根提取 ValueObject 的原始值
 * - 支持靜態工廠方法 fromEntity()
 */

import { User } from '../../Domain/Aggregates/User'

/**
 * 用戶資料傳輸物件介面
 */
export interface UserJSONData {
  /** 用戶唯一識別碼 */
  id: string
  /** 用戶名稱 */
  name: string
  /** 用戶電子郵件 */
  email: string
  /** 建立時間 (ISO 格式字串) */
  createdAt: string
}

/**
 * UserDTO 類別
 *
 * 在 DDD 架構中作為「資料傳輸物件 (DTO)」。
 * 負責在應用層與表現層之間傳遞用戶資料，並提供與領域實體之間的轉換方法。
 */
export class UserDTO {
  /** 用戶唯一識別碼 */
  id: string = ''
  /** 用戶名稱 */
  name: string = ''
  /** 用戶電子郵件 */
  email: string = ''
  /** 建立時間 */
  createdAt: Date = new Date()

  /**
   * 從領域聚合根轉換為 DTO
   *
   * @param entity - 用戶領域聚合根
   * @returns 新的 UserDTO 實例
   */
  static fromEntity(entity: User): UserDTO {
    const dto = new UserDTO()
    dto.id = entity.id
    dto.name = entity.name.value
    dto.email = entity.email.value
    dto.createdAt = entity.createdAt
    return dto
  }

  /**
   * 將 DTO 轉換為純 JSON 物件格式 (用於 HTTP 響應)
   *
   * @returns 符合 UserJSONData 介面的物件
   */
  toJSON(): UserJSONData {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      createdAt: this.createdAt.toISOString(),
    }
  }
}
