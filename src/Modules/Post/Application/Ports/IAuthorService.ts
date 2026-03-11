/**
 * Post 模組定義的作者服務介面（Port）
 *
 * 設計重點：
 * - 這是 Post 自己定義的介面，用 Post 的語言描述需求
 * - 不使用 User 模組的任何類型
 * - 只定義 Post 真正需要的欄位（Author ≠ User）
 *
 * 此模式展示 DDD 中的 Port-Adapter 模式：
 * - Port：使用方定義的介面（需求）
 * - Adapter：實現 Port 的防腐層（供應方的適配）
 */

export interface AuthorDTO {
  id: string
  name: string
  email: string
}

export interface IAuthorService {
  /**
   * 根據作者 ID 查詢作者資訊
   * @param authorId - 作者唯一識別符
   * @returns 作者資訊，若不存在則返回 null
   */
  findAuthor(authorId: string): Promise<AuthorDTO | null>
}
