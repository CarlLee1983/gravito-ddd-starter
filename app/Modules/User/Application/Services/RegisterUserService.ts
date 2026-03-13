/**
 * @file RegisterUserService.ts
 * @description 使用密碼建立新用戶的應用服務 (Application Service)
 * @module app/Modules/User/Application/Services
 */

import { User } from '../../Domain/Aggregates/User'
import { Email } from '../../Domain/ValueObjects/Email'
import { UserName } from '../../Domain/ValueObjects/UserName'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'
import { DuplicateEntityException } from '@/Shared/Domain/Exceptions'
import { randomUUID } from 'crypto'

/**
 * RegisterUserService 類別
 *
 * 在 DDD 架構中作為「應用服務 (Application Service)」。
 * 負責協調領域對象 (ValueObject, Aggregate) 與基礎設施 (Repository) 來完成「帶密碼建立新用戶」這一案例。
 *
 * 職責：
 * 1. 驗證輸入資料的有效性
 * 2. 創建 Email 和 UserName ValueObject（執行業務規則驗證）
 * 3. 檢查郵件唯一性
 * 4. 加密密碼（使用 Bun.password.hash()）
 * 5. 使用 User.createWithPassword() 工廠方法創建聚合根（產生領域事件）
 * 6. 將聚合根保存到倉儲（Repository 負責分派事件）
 * 7. 返回用戶基本資訊
 */
export class RegisterUserService {
  /**
   * 建立 RegisterUserService 實例
   *
   * @param repository - 用戶倉儲介面
   */
  constructor(private repository: IUserRepository) {}

  /**
   * 執行帶密碼的用戶註冊用例
   *
   * @param input - 註冊用戶的輸入參數
   * @returns Promise 包含建立後的用戶基本資訊
   * @throws DuplicateEntityException 如果郵件已被使用
   * @throws Error 如果名稱、郵件或密碼無效，或資料庫操作失敗
   */
  async execute(input: {
    name: string
    email: string
    password: string
  }): Promise<{ id: string; name: string; email: string }> {
    // 1. 建立 ValueObject（執行業務規則驗證）
    const email = Email.create(input.email)
    const name = UserName.create(input.name)

    // 2. 檢查電子郵件是否已被使用
    const existingUser = await this.repository.findByEmail(email)
    if (existingUser) {
      throw new DuplicateEntityException('User', 'email', email.value)
    }

    // 3. 加密密碼
    const passwordHash = await Bun.password.hash(input.password)

    // 4. 生成用戶 ID
    const userId = randomUUID()

    // 5. 建立聚合根（帶密碼，產生 UserCreated 事件）
    const user = User.createWithPassword(userId, name, email, passwordHash)

    // 6. 保存到倉儲（Repository 負責分派事件）
    await this.repository.save(user)

    // 7. 返回用戶基本資訊
    return {
      id: user.id,
      name: user.name.value,
      email: user.email.value,
    }
  }
}
