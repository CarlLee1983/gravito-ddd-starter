/**
 * Post 模組定義的作者服務介面
 *
 * 設計重點（DDD 規範）：
 * - 位置：Domain/Services/（Domain 層定義的服務介面）
 * - 所有權：Post 模組自己定義（使用方定義，不被迫用供應方的介面）
 * - 語言：Post 的語言（AuthorDTO），不暴露 User 的細節
 * - 沒有外部依賴：只定義 Post 真正需要的欄位
 *
 * DDD 模式：
 * - Domain Service Interface：Domain 層定義的依賴抽象（我需要什麼）
 * - Infrastructure Adapter：Infrastructure 層實現此介面（如何實現）
 */

import type { AuthorDTO } from '@/Shared/Application/DTOs/AuthorDTO'

export interface IAuthorService {
  /**
   * 根據作者 ID 查詢作者資訊
   * @param authorId - 作者唯一識別符
   * @returns 作者資訊，若不存在則返回 null
   */
  findAuthor(authorId: string): Promise<AuthorDTO | null>
}
