/**
 * @file PostReadModel.ts
 * @description 文章讀取模型 (Read Model)
 */

/**
 * PostReadModel 介面
 *
 * 在 DDD/CQRS 架構中作為「讀取模型 (Read Model)」。
 * 專門為表現層（前端或 API 響應）設計的扁平化資料結構，通常是不可變的 (readonly)。
 */
export interface PostReadModel {
  /** 文章唯一識別碼 */
  readonly id: string
  /** 文章標題 */
  readonly title: string
  /** 文章內容 */
  readonly content: string
  /** 作者唯一識別碼 */
  readonly authorId: string
  /** 是否已發佈 */
  readonly isPublished: boolean
  /** 是否已存檔 */
  readonly isArchived: boolean
  /** 建立時間 (ISO 格式字串) */
  readonly createdAt: string
}
