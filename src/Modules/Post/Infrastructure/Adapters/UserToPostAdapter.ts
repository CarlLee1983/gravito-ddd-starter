/**
 * @file UserToPostAdapter.ts
 * @description User 模組與 Post 模組之間的防腐層 (ACL) 適配器
 * @module src/Modules/Post/Infrastructure/Adapters
 */

import type { AuthorDTO } from '@/Shared/Application/DTOs/AuthorDTO'
import type { IAuthorService } from '../../Domain/Services/IAuthorService'
import type { IUserRepository } from '@/Modules/User/Domain/Repositories/IUserRepository'

/**
 * UserToPostAdapter 類別
 * 
 * 在 DDD 架構中作為「防腐層 (Anti-Corruption Layer, ACL)」的一部分。
 * 實現了 Post 領域層定義的 IAuthorService 介面 (Port)。
 * 
 * 職責：
 * 1. 調用 User 模組的倉儲取得資料。
 * 2. 將 User 模組的領域模型轉換為 Post 模組所使用的 AuthorDTO。
 * 3. 隔離兩個模組之間的變化，防止 User 模組的細節污染 Post 模組。
 */
export class UserToPostAdapter implements IAuthorService {
  /**
   * 建立 UserToPostAdapter 實例
   * 
   * @param userRepository - User 模組的使用者倉儲介面
   */
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * 根據作者 ID 尋找作者資訊
   * 
   * 將 User 領域物件翻譯為 Post 領域所需的 AuthorDTO 格式。
   * 
   * @param authorId - 作者唯一識別符
   * @returns Promise 包含作者資訊 DTO 或 null (若找不到)
   */
  async findAuthor(authorId: string): Promise<AuthorDTO | null> {
    // 從 User 模組的倉庫取得用戶
    const user = await this.userRepository.findById(authorId)
    if (!user) return null

    // 翻譯：User Domain 語言 → Post Domain 語言（ACL 的核心職責）
    // 注意：我們只取 Post 真正需要的欄位，過濾掉 User 的其他細節
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    }
  }
}
