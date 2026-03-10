# 範例 2：帶驗證和事件的模組 (Module with Validation & Events)

此範例展示如何建立一個帶完整驗證和領域事件的部落格文章 (BlogPost) 模組。

## 核心概念

- **Input Validation**: 使用 Zod 進行 DTO 驗證
- **Domain Events**: 領域事件用於跨模組通訊
- **Error Handling**: 自定義例外和錯誤回應
- **Rich Domain Model**: 帶複雜業務邏輯的實體

## 實作

### 1. Domain Layer - 自定義例外

**`src/Modules/BlogPost/Domain/Exceptions/BlogPostException.ts`**

```typescript
/**
 * 部落格文章異常基類
 */
export class BlogPostException extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number = 400
  ) {
    super(message)
    this.name = 'BlogPostException'
  }
}

/**
 * 部落格文章不存在異常
 */
export class BlogPostNotFoundException extends BlogPostException {
  constructor(id: string) {
    super(
      'BLOG_POST_NOT_FOUND',
      `Blog post with ID "${id}" not found`,
      404
    )
  }
}

/**
 * 無效狀態轉移異常
 */
export class InvalidStatusTransitionException extends BlogPostException {
  constructor(current: string, target: string) {
    super(
      'INVALID_STATUS_TRANSITION',
      `Cannot transition from "${current}" to "${target}"`,
      409
    )
  }
}

/**
 * 驗證異常
 */
export class ValidationException extends BlogPostException {
  constructor(message: string, readonly errors: Record<string, string> = {}) {
    super('VALIDATION_ERROR', message, 422)
  }
}
```

### 2. Domain Layer - 領域事件

**`src/Modules/BlogPost/Domain/Events/BlogPostCreatedEvent.ts`**

```typescript
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * 部落格文章已建立事件
 * 當新文章發佈時引發
 */
export class BlogPostCreatedEvent extends DomainEvent {
  constructor(
    readonly id: string,
    readonly title: string,
    readonly authorId: string,
    readonly publishedAt: Date = new Date()
  ) {
    super('BlogPost.Created', id)
  }
}
```

**`src/Modules/BlogPost/Domain/Events/BlogPostPublishedEvent.ts`**

```typescript
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * 部落格文章已發佈事件
 */
export class BlogPostPublishedEvent extends DomainEvent {
  constructor(
    readonly id: string,
    readonly title: string,
    readonly publishedAt: Date = new Date()
  ) {
    super('BlogPost.Published', id)
  }
}
```

### 3. Domain Layer - 值物件帶驗證

**`src/Modules/BlogPost/Domain/ValueObjects/BlogPostTitle.ts`**

```typescript
import { ValueObject } from '@/Shared/Domain/ValueObject'
import { ValidationException } from '../Exceptions/BlogPostException'

/**
 * 部落格文章標題值物件
 * 標題長度應在 5-200 個字元之間
 */
export class BlogPostTitle extends ValueObject {
  readonly value: string
  readonly wordCount: number

  constructor(value: string) {
    super()
    this.validate(value)
    this.value = value.trim()
    this.wordCount = this.value.split(/\s+/).length
  }

  private validate(value: string): void {
    const trimmed = value.trim()

    if (trimmed.length < 5) {
      throw new ValidationException('Title must be at least 5 characters', {
        title: 'Title is too short'
      })
    }

    if (trimmed.length > 200) {
      throw new ValidationException('Title must be at most 200 characters', {
        title: 'Title is too long'
      })
    }
  }

  equals(other: any): boolean {
    return (
      other instanceof BlogPostTitle && other.value === this.value
    )
  }

  toString(): string {
    return this.value
  }
}
```

**`src/Modules/BlogPost/Domain/ValueObjects/BlogPostContent.ts`**

```typescript
import { ValueObject } from '@/Shared/Domain/ValueObject'
import { ValidationException } from '../Exceptions/BlogPostException'

/**
 * 部落格文章內容值物件
 * 內容應至少 20 個字元
 */
export class BlogPostContent extends ValueObject {
  readonly value: string
  readonly length: number
  readonly readingTime: number // 分鐘

  constructor(value: string) {
    super()
    this.validate(value)
    this.value = value.trim()
    this.length = this.value.length
    this.readingTime = Math.ceil(this.value.split(/\s+/).length / 200) // 200 words/min
  }

  private validate(value: string): void {
    const trimmed = value.trim()

    if (trimmed.length < 20) {
      throw new ValidationException(
        'Content must be at least 20 characters',
        { content: 'Content is too short' }
      )
    }
  }

  equals(other: any): boolean {
    return (
      other instanceof BlogPostContent && other.value === this.value
    )
  }

  toString(): string {
    return this.value
  }
}
```

### 4. Domain Layer - 聚合根帶事件

**`src/Modules/BlogPost/Domain/Entities/BlogPost.ts`**

```typescript
import { AggregateRoot } from '@/Shared/Domain/AggregateRoot'
import { BlogPostTitle } from '../ValueObjects/BlogPostTitle'
import { BlogPostContent } from '../ValueObjects/BlogPostContent'
import { BlogPostCreatedEvent } from '../Events/BlogPostCreatedEvent'
import { BlogPostPublishedEvent } from '../Events/BlogPostPublishedEvent'
import { InvalidStatusTransitionException } from '../Exceptions/BlogPostException'

export type BlogPostStatus = 'draft' | 'published' | 'archived'

/**
 * 部落格文章聚合根
 * 管理文章的生命週期和發佈工作流程
 */
export class BlogPost extends AggregateRoot {
  private _status: BlogPostStatus
  private _publishedAt: Date | null
  private _viewCount: number = 0

  constructor(
    id: string,
    readonly authorId: string,
    readonly title: BlogPostTitle,
    readonly content: BlogPostContent,
    readonly tags: string[] = [],
    status: BlogPostStatus = 'draft',
    publishedAt: Date | null = null,
    readonly createdAt: Date = new Date(),
    readonly updatedAt: Date = new Date()
  ) {
    super(id)
    this._status = status
    this._publishedAt = publishedAt

    // 如果在建構時已發佈，記錄事件
    if (status === 'published' && !publishedAt) {
      this.recordEvent(new BlogPostPublishedEvent(id, title.value))
    }
  }

  // Getters
  get status(): BlogPostStatus {
    return this._status
  }

  get publishedAt(): Date | null {
    return this._publishedAt
  }

  get viewCount(): number {
    return this._viewCount
  }

  /**
   * 發佈文章
   */
  publish(): void {
    if (this._status === 'published') {
      throw new InvalidStatusTransitionException('published', 'published')
    }

    if (this._status === 'archived') {
      throw new InvalidStatusTransitionException('archived', 'published')
    }

    this._status = 'published'
    this._publishedAt = new Date()

    this.recordEvent(
      new BlogPostPublishedEvent(this.id, this.title.value)
    )
  }

  /**
   * 存檔文章
   */
  archive(): void {
    if (this._status === 'archived') {
      throw new InvalidStatusTransitionException('archived', 'archived')
    }

    this._status = 'archived'
  }

  /**
   * 記錄一次瀏覽
   */
  recordView(): void {
    if (this._status !== 'published') {
      throw new Error('Only published posts can be viewed')
    }
    this._viewCount++
  }

  /**
   * 返回純對象表示
   */
  toPlainObject() {
    return {
      id: this.id,
      authorId: this.authorId,
      title: this.title.value,
      content: this.content.value,
      tags: this.tags,
      status: this._status,
      publishedAt: this._publishedAt,
      viewCount: this._viewCount,
      readingTime: this.content.readingTime,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }
}
```

### 5. Application Layer - DTO 帶 Zod 驗證

**`src/Modules/BlogPost/Application/DTOs/CreateBlogPostDTO.ts`**

```typescript
import { z } from 'zod'

/**
 * 建立部落格文章 DTO 驗證結構
 */
export const createBlogPostSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be at most 200 characters'),
  content: z
    .string()
    .min(20, 'Content must be at least 20 characters'),
  tags: z
    .array(z.string())
    .default([])
    .optional(),
  authorId: z
    .string()
    .uuid('Invalid author ID format')
})

export type CreateBlogPostDTO = z.infer<typeof createBlogPostSchema>
```

### 6. Application Layer - 應用服務

**`src/Modules/BlogPost/Application/Services/CreateBlogPostService.ts`**

```typescript
import { IBlogPostRepository } from '../../Domain/Repositories/IBlogPostRepository'
import { BlogPost } from '../../Domain/Entities/BlogPost'
import { BlogPostTitle } from '../../Domain/ValueObjects/BlogPostTitle'
import { BlogPostContent } from '../../Domain/ValueObjects/BlogPostContent'
import { CreateBlogPostDTO, createBlogPostSchema } from '../DTOs/CreateBlogPostDTO'
import { ValidationException } from '../../Domain/Exceptions/BlogPostException'

/**
 * 建立部落格文章應用服務
 */
export class CreateBlogPostService {
  constructor(private repository: IBlogPostRepository) {}

  async execute(input: unknown): Promise<string> {
    // 驗證輸入 DTO
    const result = createBlogPostSchema.safeParse(input)
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors
      const errorMessage = Object.entries(errors)
        .map(([field, msgs]) => `${field}: ${msgs?.join(', ')}`)
        .join('; ')

      throw new ValidationException(
        'Invalid blog post data',
        Object.fromEntries(
          Object.entries(errors).map(([key, val]) => [key, val?.join(', ') || ''])
        )
      )
    }

    const dto = result.data

    try {
      // 建立值物件
      const title = new BlogPostTitle(dto.title)
      const content = new BlogPostContent(dto.content)

      // 建立聚合根
      const id = crypto.randomUUID()
      const post = new BlogPost(
        id,
        dto.authorId,
        title,
        content,
        dto.tags || []
      )

      // 保存
      await this.repository.save(post)

      return id
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to create blog post')
    }
  }
}
```

### 7. Presentation Layer - 控制器帶錯誤處理

**`src/Modules/BlogPost/Presentation/Controllers/BlogPostController.ts`**

```typescript
import { Context } from '@gravito/core'
import { CreateBlogPostService } from '../../Application/Services/CreateBlogPostService'
import { IBlogPostRepository } from '../../Domain/Repositories/IBlogPostRepository'
import { BlogPostException } from '../../Domain/Exceptions/BlogPostException'

/**
 * 部落格文章控制器
 */
export class BlogPostController {
  private createService: CreateBlogPostService

  constructor(private context: Context) {
    const repository = context.get<IBlogPostRepository>('BlogPostRepository')
    this.createService = new CreateBlogPostService(repository)
  }

  /**
   * 建立部落格文章
   * POST /api/blog-posts
   */
  async create(request: Request) {
    try {
      const body = await request.json()
      const id = await this.createService.execute(body)

      return new Response(
        JSON.stringify({
          success: true,
          data: { id },
          message: 'Blog post created successfully'
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 獲取部落格文章
   * GET /api/blog-posts/:id
   */
  async show(id: string) {
    try {
      const repository = this.context.get<IBlogPostRepository>('BlogPostRepository')
      const post = await repository.findById(id)

      if (!post) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Blog post not found'
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // 記錄瀏覽
      post.recordView()
      await repository.save(post)

      return new Response(
        JSON.stringify({
          success: true,
          data: post.toPlainObject()
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      )
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 發佈部落格文章
   * PATCH /api/blog-posts/:id/publish
   */
  async publish(id: string) {
    try {
      const repository = this.context.get<IBlogPostRepository>('BlogPostRepository')
      const post = await repository.findById(id)

      if (!post) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Blog post not found'
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      post.publish()
      await repository.save(post)

      return new Response(
        JSON.stringify({
          success: true,
          data: post.toPlainObject(),
          message: 'Blog post published successfully'
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      )
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 錯誤處理
   */
  private handleError(error: unknown) {
    console.error('Controller error:', error)

    if (error instanceof BlogPostException) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          code: error.code,
          ...(error instanceof ValidationException && {
            errors: error.errors
          })
        }),
        {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (error instanceof Error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
```

### 8. Infrastructure Layer - 事件發佈

**`src/Modules/BlogPost/Infrastructure/Subscribers/BlogPostEventSubscriber.ts`**

```typescript
import { BlogPostCreatedEvent } from '../../Domain/Events/BlogPostCreatedEvent'
import { BlogPostPublishedEvent } from '../../Domain/Events/BlogPostPublishedEvent'

/**
 * 部落格文章事件訂閱者
 * 監聽領域事件並執行副作用
 */
export class BlogPostEventSubscriber {
  /**
   * 監聽文章建立事件
   */
  onPostCreated(event: BlogPostCreatedEvent): void {
    console.log(`📝 Blog post "${event.title}" created by author ${event.authorId}`)
    // 可以在這裡發送通知、寄送郵件等
  }

  /**
   * 監聽文章發佈事件
   */
  onPostPublished(event: BlogPostPublishedEvent): void {
    console.log(
      `📢 Blog post "${event.title}" published at ${event.publishedAt}`
    )
    // 可以在這裡清除快取、發送社群媒體通知等
  }
}
```

## 測試範例

**`tests/Unit/BlogPost/CreateBlogPostService.test.ts`**

```typescript
import { describe, it, expect } from 'bun:test'
import { CreateBlogPostService } from '@/Modules/BlogPost/Application/Services/CreateBlogPostService'
import { BlogPostRepository } from '@/Modules/BlogPost/Infrastructure/Repositories/BlogPostRepository'
import { ValidationException } from '@/Modules/BlogPost/Domain/Exceptions/BlogPostException'

describe('CreateBlogPostService', () => {
  it('should create a valid blog post', async () => {
    const repository = new BlogPostRepository()
    const service = new CreateBlogPostService(repository)

    const dto = {
      title: 'My First Blog Post',
      content: 'This is the content of my first blog post. It should be long enough.',
      authorId: '550e8400-e29b-41d4-a716-446655440000',
      tags: ['javascript', 'tutorial']
    }

    const id = await service.execute(dto)
    expect(id).toBeDefined()

    const saved = await repository.findById(id)
    expect(saved?.title.value).toBe('My First Blog Post')
  })

  it('should reject title that is too short', async () => {
    const repository = new BlogPostRepository()
    const service = new CreateBlogPostService(repository)

    const dto = {
      title: 'Bad',
      content: 'This is a long enough content for the blog post.',
      authorId: '550e8400-e29b-41d4-a716-446655440000'
    }

    expect(service.execute(dto)).rejects.toThrow(ValidationException)
  })

  it('should reject invalid author ID', async () => {
    const repository = new BlogPostRepository()
    const service = new CreateBlogPostService(repository)

    const dto = {
      title: 'Valid Title Here',
      content: 'This is a long enough content for the blog post.',
      authorId: 'invalid-uuid'
    }

    expect(service.execute(dto)).rejects.toThrow(ValidationException)
  })
})
```

## 核心特性總結

✅ **豐富的領域模型**
- 值物件具有驗證邏輯
- 聚合根管理業務規則

✅ **完整的驗證**
- DTO 層：Zod 驗證
- Domain 層：業務規則驗證

✅ **事件驅動**
- 領域事件記錄重要的業務事件
- 支援跨模組通訊和副作用

✅ **錯誤處理**
- 自定義異常類別
- 適當的 HTTP 狀態碼

✅ **測試友好**
- 容易進行單元測試
- 依賴注入支援模擬
