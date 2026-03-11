/**
 * ACL：User 模組 → Post 模組的防腐層
 *
 * 設計重點：
 * - 位置：Post 模組的 Infrastructure/Adapters/（使用方的 Infrastructure 層）
 * - 職責：轉換 User 模組的資料為 Post 模組能理解的格式
 * - 隔離：Post 的 Application 層只看到 IAuthorService，不知道 User 的存在
 *
 * 建築狀況：
 * User 模組（供應方）
 *     ↓
 *  ACL 防腐層（此類：轉換介面）
 *     ↓
 * Post 模組（使用方，依賴 IAuthorService Port）
 */

import type { AuthorDTO } from '@/Shared/Application/DTOs/AuthorDTO'
import type { IAuthorService } from '../../Domain/Services/IAuthorService'
import type { IUserRepository } from '@/Modules/User/Domain/Repositories/IUserRepository'

/**
 * 實現 Post 定義的 IAuthorService Port
 *
 * 用途：
 * - 從 User 模組的倉庫取得用戶資訊
 * - 轉換為 Post 模組期望的 AuthorDTO 格式
 * - 防止 User 模組的細節滲透進 Post 模組
 */
export class UserToPostAdapter implements IAuthorService {
  constructor(private readonly userRepository: IUserRepository) {}

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
