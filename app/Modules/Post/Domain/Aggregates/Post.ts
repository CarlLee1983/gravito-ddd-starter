/**
 * @file Post.ts
 * @description 文章聚合根 (Aggregate Root)。負責封裝文章的狀態與業務規則，確保資料的一致性與完整性。
 */

import { AggregateRoot } from '@/Foundation/Domain/AggregateRoot'
import { Title } from '../ValueObjects/Title'
import { Content } from '../ValueObjects/Content'
import { PostCreated } from '../Events/PostCreated'
import { PostPublished } from '../Events/PostPublished'
import { PostArchived } from '../Events/PostArchived'
import { PostTitleChanged } from '../Events/PostTitleChanged'
import type { DomainEvent } from '@/Foundation/Domain/DomainEvent'

/**
 * 文章聚合根
 * 在 DDD 中代表文章業務實體，負責確保文章資料的完整性和一致性。
 * 所有狀態變更均通過事件驅動，不允許直接修改屬性。
 */
export class Post extends AggregateRoot {
  private _title!: Title
  private _content!: Content
  private _authorId!: string
  protected _createdAt!: Date
  private _isPublished: boolean = false
  private _isArchived: boolean = false

  /**
   * 私有建構子，強制使用靜態工廠方法建立實體
   * @param id 文章唯一識別碼
   */
  private constructor(id: string) {
    super(id)
  }

  /**
   * 建立新的文章聚合根（產生事件）
   * 遵循完全事件驅動模式：不直接設定狀態，而是透過事件驅動所有狀態變更。
   * @param id 唯一識別碼
   * @param title 文章標題 ValueObject
   * @param content 文章內容 ValueObject
   * @param authorId 作者識別碼
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
   * 此工廠方法用於從資料庫載入已存在的聚合根。
   * @param id 文章唯一識別碼
   * @param title 文章標題 ValueObject
   * @param content 文章內容 ValueObject
   * @param authorId 作者識別碼
   * @param createdAt 建立時間
   * @param isPublished 是否已發佈（預設 false）
   * @param isArchived 是否已存檔（預設 false）
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
    // 防禦性複製 Date 物件，防止外部代碼修改內部狀態
    post._createdAt = new Date(createdAt.getTime())
    post._isPublished = isPublished
    post._isArchived = isArchived
    return post
  }

  /**
   * 實作 AggregateRoot 的抽象方法：定義事件如何影響狀態
   * 當載入聚合根的歷史事件時，應用事件來重建狀態。
   * @param event 領域事件
   * @returns void
   */
  applyEvent(event: DomainEvent): void {
    if (event instanceof PostCreated) {
      this._title = Title.create(event.title)
      this._content = Content.create(event.content)
      this._authorId = event.authorId
      // 防禦性複製 Date 物件，防止外部代碼修改內部狀態
      this._createdAt = new Date(event.createdAt.getTime())
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
   * 發佈文章，將草稿文章發佈為公開可見
   * @returns void
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
   * 存檔文章，存檔後的文章無法編輯、發佈或變更
   * @returns void
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
   * @param newTitle 新的文章標題 ValueObject
   * @returns void
   * @throws Error 如果文章已存檔
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
