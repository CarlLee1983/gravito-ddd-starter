/**
 * Post 資料傳輸對象（DTO）
 *
 * 場景：
 * - PostDTO：單純的文章資訊
 * - PostWithAuthorDTO：文章 + 作者資訊的複合 DTO
 *
 * 設計目的：
 * - 將 Domain 實體（Post）轉換為 API 響應格式
 * - 不暴露 Domain 邏輯，只返回純資料
 * - 支援擴展（可輕鬆添加其他欄位）
 */

import type { AuthorDTO } from '../Ports/IAuthorService'

export interface PostDTO {
  id: string
  title: string
  content?: string
  authorId: string
  createdAt: string
}

export interface PostWithAuthorDTO extends PostDTO {
  author: AuthorDTO | null
}
