/**
 * @file PostWithAuthorDTO.ts
 * @description 定義 Post 模組的文章與作者複合資料傳輸物件 (DTO)
 * @module src/Modules/Post/Application/DTOs
 *
 * 注意：PostAuthorDTO 在此本地定義，而非導入 User 模組的 AuthorDTO。
 * 雖然兩者結構相同，但在 DDD 中屬於「概念型態複製」，
 * 允許 Post Bounded Context 獨立進化，不被 User 模組的變更所影響。
 */

/**
 * 作者資訊 DTO（本地定義）
 *
 * 此 DTO 在 Post 模組中本地定義，用於在 API 響應中表示作者基本資訊。
 * 雖然與 User 模組的 AuthorDTO 結構相同，但獨立定義可確保 Post 模組
 * 的 API 契約不會因 User 模組的改變而受影響。
 */
export interface PostAuthorDTO {
  /** 作者唯一識別碼 */
  id: string
  /** 作者名稱 */
  name: string
  /** 作者電子郵件 */
  email: string
}

/**
 * PostDTO 介面
 *
 * 在 DDD 架構中作為「資料傳輸物件 (DTO)」，負責在應用層與外部 (如 API) 之間傳遞純資料。
 * 代表單一文章的基礎資訊，不包含業務邏輯。
 */
export interface PostDTO {
  /** 文章唯一識別符 */
  id: string
  /** 文章標題 */
  title: string
  /** 文章內容 (選填) */
  content?: string
  /** 作者唯一識別符 */
  authorId: string
  /** 建立時間 (ISO 格式字串) */
  createdAt: string
}

/**
 * PostWithAuthorDTO 介面
 *
 * 繼承自 PostDTO，額外包含作者詳細資訊。
 * 這是為了前端或 API 響應需求而設計的複合 DTO。
 */
export interface PostWithAuthorDTO extends PostDTO {
  /** 作者詳細資訊，若不存在則為 null */
  author: PostAuthorDTO | null
}
