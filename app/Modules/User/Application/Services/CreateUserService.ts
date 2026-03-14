/**
 * @file CreateUserService.ts
 * @description 建立新用戶的應用服務 (Application Service)
 * @module app/Modules/User/Application/Services
 */

import { User } from '../../Domain/Aggregates/User'
import { Email } from '../../Domain/ValueObjects/Email'
import { UserName } from '../../Domain/ValueObjects/UserName'
import { UserDTO } from '../DTOs/UserDTO'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'
import { DuplicateEntityException } from '@/Foundation/Domain/Exceptions'

/**
 * CreateUserService 類別
 *
 * 在 DDD 架構中作為「應用服務 (Application Service)」。
 * 負責協調領域對象 (ValueObject, Aggregate) 與基礎設施 (Repository) 來完成「建立新用戶」這一案例 (Use Case)。
 *
 * 職責：
 * 1. 驗證輸入資料的有效性
 * 2. 創建 Email 和 UserName ValueObject（執行業務規則驗證）
 * 3. 使用 User.create() 工廠方法創建聚合根（產生領域事件）
 * 4. 將聚合根保存到倉儲（Repository 負責分派事件）
 * 5. 返回 DTO 供表現層使用
 */
export class CreateUserService {
  /**
   * 建立 CreateUserService 實例
   *
   * @param repository - 用戶倉儲介面
   */
  constructor(private repository: IUserRepository) {}

  /**
   * 執行建立用戶的用例
   *
   * @param input - 建立用戶的輸入參數
   * @returns Promise 包含建立後的用戶 DTO
   * @throws Error 如果名稱或電子郵件無效
   */
  async execute(input: {
    id: string
    name: string
    email: string
  }): Promise<UserDTO> {
    console.log('[CreateUserService.execute] 開始建立用戶:', { id: input.id, name: input.name })

    // 1. 建立 ValueObject（執行業務規則驗證）
    const email = Email.create(input.email)
    const name = UserName.create(input.name)
    console.log('[CreateUserService] ValueObjects 已建立')

    // 2. 檢查電子郵件是否已被使用
    const existingUser = await this.repository.findByEmail(email)
    if (existingUser) {
      throw new DuplicateEntityException('User', 'email', email.value)
    }

    // 3. 建立聚合根（產生 UserCreated 事件）
    const user = User.create(input.id, name, email)
    console.log('[CreateUserService] User 聚合根已建立，未提交事件:', user.getUncommittedEvents().length)

    // 4. 保存到倉儲（Repository 負責分派事件）
    console.log('[CreateUserService] 開始呼叫 repository.save()...')
    await this.repository.save(user)
    console.log('[CreateUserService] repository.save() 完成')

    // 5. 轉換為 DTO 供表現層使用
    const dto = UserDTO.fromEntity(user)
    console.log('[CreateUserService.execute] 用戶建立完成:', { userId: dto.id })
    return dto
  }
}
