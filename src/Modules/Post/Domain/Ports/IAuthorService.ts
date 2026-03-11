/**
 * Post 模組定義的作者服務介面（Port）
 *
 * 設計重點（DDD）：
 * - 位置：Domain 層定義（因為 Post Domain 層依賴此介面）
 * - 所有權：Post 模組自己定義（使用方定義介面，不被迫用供應方的介面）
 * - 語言：Post 的語言（AuthorDTO），不暴露 User 的細節
 * - 沒有外部依賴：只定義 Post 真正需要的欄位
 *
 * 此模式展示 DDD 中的 Port-Adapter 模式：
 * - Port：Domain 層定義的依賴抽象（我需要什麼）
 * - Adapter：Infrastructure 層實現 Port（如何實現）
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
