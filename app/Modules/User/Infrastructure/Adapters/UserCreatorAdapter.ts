/**
 * @file UserCreatorAdapter.ts
 * @description IUserCreator Port 的適配器實現
 *
 * 防腐層（Anti-Corruption Layer）：
 * - 隱藏 User 模組的實現細節
 * - 向 Auth 模組提供簡潔的 IUserCreator 介面
 * - 使 Auth 和 User 模組可以獨立演進
 */

import { IUserCreator, type UserCreationResult } from '@/Foundation/Infrastructure/Ports/Auth/IUserCreator'
import { RegisterUserService } from '../../Application/Services/RegisterUserService'

/**
 * UserCreatorAdapter 類別
 *
 * 實現 IUserCreator Port，協調 RegisterUserService 和底層 Repository。
 */
export class UserCreatorAdapter implements IUserCreator {
  /**
   * 建立 UserCreatorAdapter 實例
   *
   * @param registerUserService - 用戶註冊應用服務
   */
  constructor(private registerUserService: RegisterUserService) {}

  /**
   * 實現 IUserCreator.create()
   *
   * 建立新用戶（含密碼），若郵件已存在則返回 null。
   *
   * @param name - 用戶名稱
   * @param email - 用戶郵件
   * @param password - 用戶密碼（原文）
   * @returns 建立成功時返回 UserCreationResult；重複郵件時返回 null
   */
  async create(name: string, email: string, password: string): Promise<UserCreationResult | null> {
    try {
      const result = await this.registerUserService.execute({
        name,
        email,
        password,
      })

      return {
        id: result.id,
        name: result.name,
        email: result.email,
      }
    } catch (error) {
      // 如果是重複郵件異常，返回 null；其他異常則拋出
      if (error instanceof Error && error.message.includes('email')) {
        return null
      }
      throw error
    }
  }
}
