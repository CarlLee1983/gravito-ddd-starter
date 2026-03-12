/**
 * @file Post.ts
 * @description 文章聚合根 (Aggregate Root)
 *
 * 在 DDD 架構中的角色：
 * - 領域層 (Domain Layer)：系統的核心業務邏輯模型。
 * - 職責：封裝文章的狀態與業務規則，確保資料的一致性與完整性。
 *
 * Phase 3 改造：
 * - 使用 Title 和 Content ValueObject
 * - 使用 reconstitute() 而非 fromDatabase()
 * - 實作 applyEvent() 處理領域事件
 */

import { AggregateRoot } from '@/Shared/Domain/AggregateRoot'
import { Title } from '../ValueObjects/Title'
import { Content } from '../ValueObjects/Content'
import { PostCreated } from '../Events/PostCreated'
import { PostPublished } from '../Events/PostPublished'
import { PostArchived } from '../Events/PostArchived'
import { PostTitleChanged } from '../Events/PostTitleChanged'
import type { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * 文章聚合根
 *
 * 在 DDD 中代表文章業務實體，負責確保文章資料的完整性和一致性。
 * 所有狀態變更均通過事件驅動，不允許直接修改屬性。
 */
export class Post extends AggregateRoot {
  private _title!: Title
  private _content!: Content
  private _authorId!: string
  private _createdAt!: Date
  private _isPublished: boolean = false
  private _isArchived: boolean = false

  /**
   * 私有建構子，強制使用靜態工廠方法建立實體
   * @param id - 文章唯一識別碼
   * @private
   */
  private constructor(id: string) {
    super(id)
  }

  /**
   * 建立新的文章聚合根（產生事件）
   *
   * 遵循完全事件驅動模式：不直接設定狀態，而是透過事件驅動所有狀態變更。
   *
   * @param id - 唯一識別碼
   * @param title - 文章標題 ValueObject
   * @param content - 文章內容 ValueObject
   * @param authorId - 作者識別碼
   * @returns 新的 Post 實體（包含未提交事件）
   */
  static create(id: string, title: Title, content: Content, authorId: string): Post {
    const post = new Post(id)
    const createdAt = new Date()

    // ✨ 發佈領域事件 - 所有狀態由 applyEvent() 設定
    post.raiseEvent(new PostCreated(id, title.value, content.value, authorId, createdAt))

    return post
  }

  /**
   * 從儲存的資料還原聚合根（無事件）
   *
   * 此工廠方法用於從資料庫載入已存在的聚合根。
   * 不會產生任何事件，因為聚合根已存在且未發生變更。
   *
   * @param id - 文章唯一識別碼
   * @param title - 文章標題 ValueObject
   * @param content - 文章內容 ValueObject
   * @param authorId - 作者識別碼
   * @param createdAt - 建立時間
   * @param isPublished - 是否已發佈（預設 false）
   * @param isArchived - 是否已存檔（預設 false）
   * @returns 還原後的 Post 實體
   */
  static reconstitute(
    id: string,
    title: Title,
    content: Content,
    authorId: string,
    createdAt: Date,
    isPublished: boolean = false,
    isArchived: boolean = false
  ): Post {
    const post = new Post(id)
    post._title = title
    post._content = content
    post._authorId = authorId
    post._createdAt = createdAt
    post._isPublished = isPublished
    post._isArchived = isArchived
    return post
  }

  /**
   * 實作 AggregateRoot 的抽象方法：定義事件如何影響狀態
   *
   * 當載入聚合根的歷史事件時，應用事件來重建狀態。
   * 所有狀態變更完全由事件驅動，確保 Event Sourcing 的完整性。
   */
  applyEvent(event: DomainEvent): void {
    if (event instanceof PostCreated) {
      this._title = Title.create(event.title)
      this._content = Content.create(event.content)
      this._authorId = event.authorId
      this._createdAt = event.createdAt
    } else if (event instanceof PostPublished) {
      this._isPublished = true
    } else if (event instanceof PostArchived) {
      this._isArchived = true
    } else if (event instanceof PostTitleChanged) {
      this._title = Title.create(event.newTitle)
    }
  }

  // ============ 行為方法（發佈事件） ============

  /**
   * 發佈文章
   *
   * 將草稿文章發佈為公開可見。
   * 發佈後的文章無法變更為草稿狀態。
   *
   * @throws Error 如果文章已發佈或已存檔
   */
  publish(): void {
    if (this._isPublished) {
      throw new Error('文章已發佈，無法重複發佈')
    }

    if (this._isArchived) {
      throw new Error('已存檔的文章無法發佈')
    }

    // 發佈事件 - applyEvent() 會設定 _isPublished = true
    this.raiseEvent(new PostPublished(this.id, this._authorId))
  }

  /**
   * 存檔文章
   *
   * 將文章存檔。存檔後的文章無法編輯、發佈或變更。
   * 存檔是一個終止狀態。
   *
   * @throws Error 如果文章已存檔
   */
  archive(): void {
    if (this._isArchived) {
      throw new Error('文章已存檔，無法重複存檔')
    }

    // 發佈事件 - applyEvent() 會設定 _isArchived = true
    this.raiseEvent(new PostArchived(this.id, this._authorId))
  }

  /**
   * 變更文章標題
   *
   * 修改文章標題。已存檔的文章無法變更標題。
   *
   * @param newTitle - 新的文章標題 ValueObject
   * @throws Error 如果標題驗證失敗或文章已存檔
   */
  changeTitle(newTitle: Title): void {
    if (this._isArchived) {
      throw new Error('已存檔的文章無法變更標題')
    }

    // 如果標題相同，無需發佈事件
    if (this._title.equals(newTitle)) {
      return
    }

    // 發佈事件 - applyEvent() 會更新 _title
    this.raiseEvent(new PostTitleChanged(this.id, this._title.value, newTitle.value))
  }

  // ============ Getters （只讀屬性） ============

  /** 取得文章標題 ValueObject */
  get title(): Title {
    return this._title
  }

  /** 取得文章內容 ValueObject */
  get content(): Content {
    return this._content
  }

  /** 取得作者識別碼 */
  get authorId(): string {
    return this._authorId
  }

  /** 取得建立時間 */
  get createdAt(): Date {
    return new Date(this._createdAt.getTime())
  }

  /** 取得是否已發佈 */
  get isPublished(): boolean {
    return this._isPublished
  }

  /** 取得是否已存檔 */
  get isArchived(): boolean {
    return this._isArchived
  }
}
