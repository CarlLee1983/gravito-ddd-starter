# 範例 2：帶驗證和事件的模組 (Module with Validation & Events)

此範例展示如何建立一個帶完整驗證和領域事件的部落格文章 (BlogPost) 模組。

## 核心概念

- **Input Validation**: 使用 Zod 進行 DTO 驗證
- **Domain Events**: 領域事件用於跨模組通訊 (整合 @gravito/core 事件系統)
- **Error Handling**: 自定義例外和錯誤回應
- **Rich Domain Model**: 帶複雜業務邏輯的實體

## 實作

### 1. Domain Layer - 自定義例外

**`app/Modules/BlogPost/Domain/Exceptions/BlogPostException.ts`**

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

**`app/Modules/BlogPost/Domain/Events/BlogPostCreatedEvent.ts`**

```typescript
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * 部落格文章已建立事件
 * 當新文章建立時引發
 */
export class BlogPostCreatedEvent extends DomainEvent {
  constructor(
    readonly id: string,
    readonly title: string,
    readonly authorId: string,
    readonly createdAt: Date = new Date()
  ) {
    super('BlogPost.Created', id)
  }
}
```

**`app/Modules/BlogPost/Domain/Events/BlogPostPublishedEvent.ts`**

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

**`app/Modules/BlogPost/Domain/ValueObjects/BlogPostTitle.ts`**

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

### 4. Domain Layer - 聚合根帶事件

**`app/Modules/BlogPost/Domain/Entities/BlogPost.ts`**

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

    // 如果是新建立的，記錄建立事件
    if (this.isNew()) {
      this.recordEvent(new BlogPostCreatedEvent(id, title.value, authorId))
    }
  }

  // Getters
  get status(): BlogPostStatus {
    return this._status
  }

  get publishedAt(): Date | null {
    return this._publishedAt
  }

  /**
   * 發佈文章
   */
  publish(): void {
    if (this._status === 'published') {
      throw new InvalidStatusTransitionException('published', 'published')
    }

    this._status = 'published'
    this._publishedAt = new Date()

    // 記錄發佈事件
    this.recordEvent(
      new BlogPostPublishedEvent(this.id, this.title.value, this._publishedAt)
    )
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
      status: this._status,
      publishedAt: this._publishedAt,
      createdAt: this.createdAt
    }
  }
}
```

### 5. Application Layer - DTO 帶 Zod 驗證

**`app/Modules/BlogPost/Application/DTOs/CreateBlogPostDTO.ts`**

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
  authorId: z
    .string()
    .uuid('Invalid author ID format')
})

export type CreateBlogPostDTO = z.infer<typeof createBlogPostSchema>
```

### 6. Application Layer - 應用服務

**`app/Modules/BlogPost/Application/Services/CreateBlogPostService.ts`**

```typescript
import { IBlogPostRepository } from '../../Domain/Repositories/IBlogPostRepository'
import { BlogPost } from '../../Domain/Entities/BlogPost'
import { BlogPostTitle } from '../../Domain/ValueObjects/BlogPostTitle'
import { BlogPostContent } from '../../Domain/ValueObjects/BlogPostContent'
import { createBlogPostSchema } from '../DTOs/CreateBlogPostDTO'
import { ValidationException } from '../../Domain/Exceptions/BlogPostException'

/**
 * 建立部落格文章應用服務
 */
export class CreateBlogPostService {
  constructor(private repository: IBlogPostRepository) {}

  async execute(input: unknown): Promise<string> {
    // 1. 驗證輸入 DTO (Zod)
    const result = createBlogPostSchema.safeParse(input)
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors
      throw new ValidationException(
        'Invalid blog post data',
        Object.fromEntries(
          Object.entries(errors).map(([key, val]) => [key, val?.join(', ') || ''])
        )
      )
    }

    const dto = result.data

    // 2. 建立值物件與聚合根
    const title = new BlogPostTitle(dto.title)
    const content = new BlogPostContent(dto.content)

    const id = crypto.randomUUID()
    const post = new BlogPost(id, dto.authorId, title, content)

    // 3. 保存 (Repository 會負責分派領域事件)
    await this.repository.save(post)

    return id
  }
}
```

### 7. Presentation Layer - 控制器

**`app/Modules/BlogPost/Presentation/Controllers/BlogPostController.ts`**

```typescript
import { Context } from '@gravito/core'
import { CreateBlogPostService } from '../../Application/Services/CreateBlogPostService'
import { IBlogPostRepository } from '../../Domain/Repositories/IBlogPostRepository'
import { BlogPostException, ValidationException } from '../../Domain/Exceptions/BlogPostException'

/**
 * 部落格文章控制器
 */
export class BlogPostController {
  private createService: CreateBlogPostService

  constructor(private context: Context) {
    const repository = context.container.make<IBlogPostRepository>('BlogPostRepository')
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
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 錯誤處理與回應轉換
   */
  private handleError(error: unknown) {
    if (error instanceof BlogPostException) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          code: error.code,
          ...(error instanceof ValidationException && { errors: error.errors })
        }),
        { status: error.statusCode, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
```

### 8. 模組入口與事件訂閱 (Auto-Wiring)

**`app/Modules/BlogPost/index.ts`**

```typescript
import { ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { BlogPostController } from './Presentation/Controllers/BlogPostController'
import type { IModuleDefinition } from '@/Shared/Infrastructure/Framework/ModuleDefinition'

/**
 * 部落格文章模組服務提供者
 */
export class BlogPostServiceProvider extends ModuleServiceProvider {
  override register(container: any): void {
    // 可以在這裡註冊事件訂閱者 (Subscribers)
  }
}

/**
 * 模組定義 (符合 ModuleAutoWirer 規範)
 */
export const BlogPostModule: IModuleDefinition = {
  name: 'BlogPost',
  
  provider: BlogPostServiceProvider,

  registerRepositories(db, eventDispatcher) {
    console.log('[BlogPost] Registering repositories and subscribing to events...')
    
    // 範例：訂閱領域事件
    if (eventDispatcher) {
       eventDispatcher.listen('BlogPost.Created', (event: any) => {
         console.log(`📢 系統通知: 新文章 "${event.title}" 已建立`)
       })
    }
  },

  registerRoutes({ createModuleRouter }) {
    const router = createModuleRouter()
    router.post('/', BlogPostController, 'create')
  }
}
```

## 測試範例

**`tests/Unit/BlogPost/CreateBlogPostService.test.ts`**

```typescript
import { describe, it, expect } from 'bun:test'
import { CreateBlogPostService } from '@/Modules/BlogPost/Application/Services/CreateBlogPostService'
import { ValidationException } from '@/Modules/BlogPost/Domain/Exceptions/BlogPostException'

// Mock Repository
const mockRepository: any = {
  save: async () => {}
}

describe('CreateBlogPostService', () => {
  it('should create a valid blog post', async () => {
    const service = new CreateBlogPostService(mockRepository)

    const dto = {
      title: 'My First Blog Post',
      content: 'This is the content of my first blog post. It should be long enough.',
      authorId: '550e8400-e29b-41d4-a716-446655440000'
    }

    const id = await service.execute(dto)
    expect(id).toBeDefined()
    expect(typeof id).toBe('string')
  })

  it('should throw ValidationException for short title', async () => {
    const service = new CreateBlogPostService(mockRepository)

    const dto = {
      title: 'Bad',
      content: 'Valid content but title is too short.',
      authorId: '550e8400-e29b-41d4-a716-446655440000'
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
