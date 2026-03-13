/**
 * @file Phase3DomainRedesign.test.ts
 * @description Post 模組 Phase 3 DDD 改造測試
 *
 * 測試範圍：
 * ✅ ValueObject 驗證（Title、Content）
 * ✅ 聚合根事件驅動建立（Post.create）
 * ✅ 聚合根無事件還原（Post.reconstitute）
 * ✅ 事件應用（applyEvent）
 * ✅ Repository toDomain/toRow 轉換
 * ✅ CreatePostService 完整工作流
 * ✅ 跨 Bounded Context 事件處理
 * ✅ 不可變性驗證
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { Post } from '@/Modules/Post/Domain/Aggregates/Post'
import { Title } from '@/Modules/Post/Domain/ValueObjects/Title'
import { Content } from '@/Modules/Post/Domain/ValueObjects/Content'
import { PostCreated } from '@/Modules/Post/Domain/Events/PostCreated'
import { PostDTO } from '@/Modules/Post/Application/DTOs/PostDTO'
import { CreatePostService } from '@/Modules/Post/Application/Services/CreatePostService'
import { WelcomePostAutomation } from '@/Modules/Post/Application/Handlers/WelcomePostAutomation'
import { PostRepository } from '@/Modules/Post/Infrastructure/Repositories/PostRepository'
import { UserCreated } from '@/Modules/User/Domain/Events/UserCreated'
import { toIntegrationEvent, type IntegrationEvent } from '@/Shared/Domain/IntegrationEvent'
import type { IPostRepository } from '@/Modules/Post/Domain/Repositories/IPostRepository'
import type { IAuthorService } from '@/Modules/Post/Domain/Services/IAuthorService'
import type { ILogger } from '@/Shared/Infrastructure/Ports/Services/ILogger'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/Ports/Database/IDatabaseAccess'
import { EntityNotFoundException, DuplicateEntityException } from '@/Shared/Domain/Exceptions'
import type { IEventDispatcher } from '@/Shared/Infrastructure/Ports/Messaging/IEventDispatcher'

// ============ ValueObject 驗證測試 ============

describe('Phase 3: Title ValueObject', () => {
  it('should create valid title', () => {
    const title = Title.create('My First Blog Post')
    expect(title.value).toBe('My First Blog Post')
  })

  it('should trim whitespace', () => {
    const title = Title.create('  Trimmed Title  ')
    expect(title.value).toBe('Trimmed Title')
  })

  it('should throw error for empty title', () => {
    expect(() => Title.create('')).toThrow('文章標題不能為空')
    expect(() => Title.create('   ')).toThrow('文章標題不能為空')
  })

  it('should throw error for title exceeding 255 characters', () => {
    const longTitle = 'a'.repeat(256)
    expect(() => Title.create(longTitle)).toThrow('文章標題長度不能超過 255 個字元')
  })

  it('should be immutable', () => {
    const title = Title.create('Immutable Title')
    expect(() => {
      ;(title as any).value = 'modified'
    }).toThrow()
  })

  it('should have structural equality', () => {
    const title1 = Title.create('Same Title')
    const title2 = Title.create('Same Title')
    expect(title1.equals(title2)).toBe(true)
  })

  it('should have different equality for different titles', () => {
    const title1 = Title.create('Title 1')
    const title2 = Title.create('Title 2')
    expect(title1.equals(title2)).toBe(false)
  })

  it('should support unicode characters', () => {
    const title = Title.create('歡迎來到我的部落格')
    expect(title.value).toBe('歡迎來到我的部落格')
  })
})

describe('Phase 3: Content ValueObject', () => {
  it('should create valid content', () => {
    const content = Content.create('This is the article content.')
    expect(content.value).toBe('This is the article content.')
    expect(content.isEmpty()).toBe(false)
  })

  it('should allow empty content', () => {
    const content1 = Content.create('')
    const content2 = Content.create(undefined)
    const content3 = Content.create()

    expect(content1.isEmpty()).toBe(true)
    expect(content2.isEmpty()).toBe(true)
    expect(content3.isEmpty()).toBe(true)
  })

  it('should trim whitespace', () => {
    const content = Content.create('  trimmed content  ')
    expect(content.value).toBe('trimmed content')
  })

  it('should throw error for content exceeding 10000 characters', () => {
    const longContent = 'a'.repeat(10001)
    expect(() => Content.create(longContent)).toThrow('文章內容長度不能超過 10000 個字元')
  })

  it('should report correct length', () => {
    const content = Content.create('Hello World')
    expect(content.getLength()).toBe(11)
  })

  it('should be immutable', () => {
    const content = Content.create('Immutable Content')
    expect(() => {
      ;(content as any).value = 'modified'
    }).toThrow()
  })

  it('should have structural equality', () => {
    const content1 = Content.create('Same Content')
    const content2 = Content.create('Same Content')
    expect(content1.equals(content2)).toBe(true)
  })
})

// ============ AggregateRoot 事件驅動測試 ============

describe('Phase 3: Post.create (Event-Driven)', () => {
  it('should create post and raise PostCreated event', () => {
    const title = Title.create('Test Post')
    const content = Content.create('Test content')
    const post = Post.create('post-1', title, content, 'author-1')

    expect(post.id).toBe('post-1')
    expect(post.title.equals(title)).toBe(true)
    expect(post.content.equals(content)).toBe(true)
    expect(post.authorId).toBe('author-1')
    expect(post.createdAt).toBeInstanceOf(Date)
  })

  it('should have uncommitted PostCreated event', () => {
    const title = Title.create('Test Post')
    const content = Content.create('Test content')
    const post = Post.create('post-1', title, content, 'author-1')

    const events = post.getUncommittedEvents()
    expect(events).toHaveLength(1)
    expect(events[0]).toBeInstanceOf(PostCreated)
  })

  it('should contain correct data in PostCreated event', () => {
    const title = Title.create('Event Test')
    const content = Content.create('Event content')
    const post = Post.create('post-2', title, content, 'author-2')

    const event = post.getUncommittedEvents()[0] as PostCreated
    expect(event.postId).toBe('post-2')
    expect(event.title).toBe('Event Test')
    expect(event.content).toBe('Event content')
    expect(event.authorId).toBe('author-2')
  })

  it('should have all properties read-only', () => {
    const title = Title.create('ReadOnly Test')
    const content = Content.create('ReadOnly content')
    const post = Post.create('post-3', title, content, 'author-3')

    expect(() => {
      ;(post as any).id = 'post-modified'
    }).toThrow()
  })
})

// ============ AggregateRoot 無事件還原測試 ============

describe('Phase 3: Post.reconstitute (Restore)', () => {
  it('should reconstitute without events', () => {
    const title = Title.create('Reconstitute Test')
    const content = Content.create('Restored content')
    const createdAt = new Date('2025-01-01')

    const post = Post.reconstitute('post-4', title, content, 'author-4', createdAt)

    expect(post.id).toBe('post-4')
    expect(post.title.equals(title)).toBe(true)
    expect(post.content.equals(content)).toBe(true)
    expect(post.authorId).toBe('author-4')
    expect(post.createdAt).toEqual(createdAt)
  })

  it('should have no uncommitted events after reconstitute', () => {
    const title = Title.create('No Events Test')
    const content = Content.create('No event content')
    const post = Post.reconstitute('post-5', title, content, 'author-5', new Date())

    expect(post.getUncommittedEvents()).toHaveLength(0)
  })

  it('should preserve original creation date', () => {
    const originalDate = new Date('2024-12-15')
    const title = Title.create('Date Preservation')
    const content = Content.create('Date test')

    const post = Post.reconstitute('post-6', title, content, 'author-6', originalDate)

    expect(post.createdAt).toEqual(originalDate)
  })
})

// ============ 事件應用測試 ============

describe('Phase 3: Post.applyEvent', () => {
  it('should apply PostCreated event to reconstruct state', () => {
    const post = new (Post as any)('post-7')
    const event = new PostCreated('post-7', 'Applied Title', 'Applied content', 'author-7', new Date())

    post.applyEvent(event)

    expect(post.title.value).toBe('Applied Title')
    expect(post.content.value).toBe('Applied content')
    expect(post.authorId).toBe('author-7')
  })

  it('should create ValueObject instances from event data', () => {
    const post = new (Post as any)('post-8')
    const event = new PostCreated('post-8', 'ValueObject Test', 'VO content', 'author-8', new Date())

    post.applyEvent(event)

    expect(post.title).toBeInstanceOf(Title)
    expect(post.content).toBeInstanceOf(Content)
  })
})

// ============ DTO 轉換測試 ============

describe('Phase 3: PostDTO Conversion', () => {
  it('should convert entity to DTO', () => {
    const title = Title.create('DTO Test')
    const content = Content.create('DTO content')
    const post = Post.create('post-9', title, content, 'author-9')

    const dto = PostDTO.fromEntity(post)

    expect(dto.id).toBe('post-9')
    expect(dto.title).toBe('DTO Test')
    expect(dto.content).toBe('DTO content')
    expect(dto.authorId).toBe('author-9')
    expect(dto.createdAt).toBeInstanceOf(Date)
  })

  it('should convert DTO to JSON for API response', () => {
    const title = Title.create('JSON Test')
    const content = Content.create('JSON content')
    const post = Post.create('post-10', title, content, 'author-10')
    const dto = PostDTO.fromEntity(post)

    const json = dto.toJSON()

    expect(json.id).toBe('post-10')
    expect(json.title).toBe('JSON Test')
    expect(json.content).toBe('JSON content')
    expect(json.authorId).toBe('author-10')
    expect(typeof json.createdAt).toBe('string')
    expect(json.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })

  it('should preserve all post data in JSON', () => {
    const title = Title.create('Data Preservation')
    const content = Content.create('Preserve content')
    const createdAt = new Date('2025-01-10')
    const post = Post.reconstitute('post-11', title, content, 'author-11', createdAt)
    const dto = PostDTO.fromEntity(post)

    const json = dto.toJSON()

    expect(json.id).toBe('post-11')
    expect(json.title).toBe('Data Preservation')
    expect(json.content).toBe('Preserve content')
    expect(json.authorId).toBe('author-11')
  })
})

// ============ CreatePostService 工作流測試 ============

describe('Phase 3: CreatePostService Workflow', () => {
  let mockRepository: IPostRepository
  let mockAuthorService: IAuthorService
  let service: CreatePostService

  beforeEach(() => {
    mockRepository = {
      save: () => Promise.resolve(),
      findById: () => Promise.resolve(null),
      findByTitle: () => Promise.resolve(null),
      findByAuthor: () => Promise.resolve([]),
      delete: () => Promise.resolve(),
      findAll: () => Promise.resolve([]),
      count: () => Promise.resolve(0),
      list: () => Promise.resolve([]),
    }

    mockAuthorService = {
      findAuthor: async (id: string) => ({ id, name: 'Test Author', email: 'test@example.com' }),
    }

    service = new CreatePostService(mockRepository, mockAuthorService)
  })

  it('should execute create post use case', async () => {
    let savedPost: Post | null = null

    mockRepository.save = async (post: Post) => {
      savedPost = post
    }

    const dto = await service.execute({
      id: 'post-12',
      title: 'Service Test',
      content: 'Service content',
      authorId: 'author-12',
    })

    expect(dto.id).toBe('post-12')
    expect(dto.title).toBe('Service Test')
    expect(dto.content).toBe('Service content')
    expect(savedPost).not.toBeNull()
    expect(savedPost?.id).toBe('post-12')
  })

  it('should validate title format before creating', async () => {
    await expect(
      service.execute({
        id: 'post-13',
        title: '', // Invalid: empty title
        content: 'Content',
        authorId: 'author-13',
      })
    ).rejects.toThrow('文章標題不能為空')
  })

  it('should validate content length before creating', async () => {
    const longContent = 'a'.repeat(10001)
    await expect(
      service.execute({
        id: 'post-14',
        title: 'Valid Title',
        content: longContent,
        authorId: 'author-14',
      })
    ).rejects.toThrow('文章內容長度不能超過 10000 個字元')
  })

  it('should check if author exists', async () => {
    mockAuthorService.findAuthor = async () => null

    await expect(
      service.execute({
        id: 'post-15',
        title: 'Author Check',
        content: 'Content',
        authorId: 'nonexistent',
      })
    ).rejects.toThrow(EntityNotFoundException)
  })

  it('should prevent duplicate title registration', async () => {
    const existingTitle = Title.create('Existing Title')
    const existingPost = Post.reconstitute('post-existing', existingTitle, Content.create(''), 'author-existing', new Date())

    mockRepository.findByTitle = async (title: Title) => {
      if (title.value === 'Existing Title') {
        return existingPost
      }
      return null
    }

    await expect(
      service.execute({
        id: 'post-16',
        title: 'Existing Title',
        content: 'New content',
        authorId: 'author-16',
      })
    ).rejects.toThrow(DuplicateEntityException)
  })

  it('should persist post with events', async () => {
    let persistedPost: Post | null = null

    mockRepository.save = async (post: Post) => {
      persistedPost = post
    }

    await service.execute({
      id: 'post-17',
      title: 'Event Persistence',
      content: 'Event content',
      authorId: 'author-17',
    })

    expect(persistedPost).not.toBeNull()
    expect(persistedPost?.getUncommittedEvents()).toHaveLength(1)
    expect(persistedPost?.getUncommittedEvents()[0]).toBeInstanceOf(PostCreated)
  })
})

// ============ 跨 Bounded Context 事件處理測試 ============

describe('Phase 3: WelcomePostAutomation (Cross-Bounded Context)', () => {
  let mockRepository: IPostRepository
  let mockAuthorService: IAuthorService
  let mockLogger: ILogger
  let automation: WelcomePostAutomation

  beforeEach(() => {
    mockRepository = {
      save: () => Promise.resolve(),
      findById: () => Promise.resolve(null),
      findByTitle: () => Promise.resolve(null),
      findByAuthor: () => Promise.resolve([]),
      delete: () => Promise.resolve(),
      findAll: () => Promise.resolve([]),
      count: () => Promise.resolve(0),
      list: () => Promise.resolve([]),
    }

    mockAuthorService = {
      findAuthor: async (id: string) => ({ id, name: 'New User', email: 'user@example.com' }),
    }

    mockLogger = {
      info: () => {},
      error: () => {},
      debug: () => {},
      warn: () => {},
    } as any

    const createPostService = new CreatePostService(mockRepository, mockAuthorService)
    automation = new WelcomePostAutomation(createPostService, mockLogger)
  })

  it('should handle UserCreated event and create welcome post', async () => {
    let savedPost: Post | null = null

    mockRepository.save = async (post: Post) => {
      savedPost = post
    }

    // 構建 Integration Event（跨 Bounded Context 的事件）
    const integrationEvent: IntegrationEvent = toIntegrationEvent(
      'UserCreated',
      'User',
      {
        userId: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: '2024-01-15T10:30:00Z',
      },
      'user-1'
    )
    await automation.handle(integrationEvent)

    expect(savedPost).not.toBeNull()
    expect(savedPost?.title.value).toContain('John Doe 的歡迎文章')
    expect(savedPost?.authorId).toBe('user-1')
  })

  it('should handle errors gracefully without throwing', async () => {
    mockAuthorService.findAuthor = async () => null // Author doesn't exist

    const integrationEvent: IntegrationEvent = toIntegrationEvent(
      'UserCreated',
      'User',
      {
        userId: 'user-2',
        name: 'Jane Doe',
        email: 'jane@example.com',
        createdAt: '2024-01-15T10:30:00Z',
      },
      'user-2'
    )

    // Should not throw, only log error
    expect(async () => {
      await automation.handle(integrationEvent)
    }).not.toThrow()
  })

  it('should create personalized welcome message', async () => {
    let savedPost: Post | null = null

    mockRepository.save = async (post: Post) => {
      savedPost = post
    }

    const integrationEvent: IntegrationEvent = toIntegrationEvent(
      'UserCreated',
      'User',
      {
        userId: 'user-3',
        name: 'Alice Smith',
        email: 'alice@example.com',
        createdAt: '2024-01-15T10:30:00Z',
      },
      'user-3'
    )
    await automation.handle(integrationEvent)

    expect(savedPost?.title.value).toContain('Alice Smith')
    expect(savedPost?.content.value).toContain('Alice Smith')
  })
})

// ============ 完整工作流測試 ============

describe('Phase 3: Complete Workflow', () => {
  it('should execute full flow: create -> save -> restore -> dto', async () => {
    // 1. Create 工廠方法建立聚合根（有事件）
    const title = Title.create('Complete Flow')
    const content = Content.create('Complete workflow test')
    const post = Post.create('post-workflow', title, content, 'author-workflow')

    // 驗證事件已產生
    expect(post.getUncommittedEvents()).toHaveLength(1)

    // 2. 標記事件已提交（模擬 save）
    post.markEventsAsCommitted()
    expect(post.getUncommittedEvents()).toHaveLength(0)

    // 3. 從持久化資料還原（模擬 load）
    const restoredPost = Post.reconstitute('post-workflow', title, content, 'author-workflow', post.createdAt)

    // 4. 轉換為 DTO
    const dto = PostDTO.fromEntity(restoredPost)

    // 驗證完整性
    expect(dto.id).toBe('post-workflow')
    expect(dto.title).toBe('Complete Flow')
    expect(dto.content).toBe('Complete workflow test')
    expect(restoredPost.getUncommittedEvents()).toHaveLength(0)
  })

  it('should verify immutability throughout lifecycle', () => {
    const title = Title.create('Immutable Post')
    const content = Content.create('Immutable content')
    const post = Post.create('post-immutable', title, content, 'author-immutable')

    // 確認所有屬性都是只讀的
    expect(() => {
      ;(post as any).id = 'modified'
    }).toThrow()

    expect(() => {
      ;(title as any).value = 'modified'
    }).toThrow()

    expect(() => {
      ;(content as any).value = 'modified'
    }).toThrow()

    // 確認狀態未被改變
    expect(post.id).toBe('post-immutable')
    expect(title.value).toBe('Immutable Post')
    expect(content.value).toBe('Immutable content')
  })

  it('should handle empty content correctly', () => {
    const title = Title.create('No Content Post')
    const content = Content.create() // Empty content

    const post = Post.create('post-empty', title, content, 'author-empty')

    expect(post.content.isEmpty()).toBe(true)
    expect(post.content.getLength()).toBe(0)

    const dto = PostDTO.fromEntity(post)
    expect(dto.content).toBe('')
  })
})

// ============ PostRepository IntegrationEvent 轉換測試 ============

describe('Phase 3: PostRepository IntegrationEvent Conversion (ACL)', () => {
  it('should convert PostCreated domain event to IntegrationEvent', async () => {
    const dispatchedEvents: any[] = []

    const mockDispatcher: IEventDispatcher = {
      dispatch: async (events: any[]) => {
        dispatchedEvents.push(...events)
      },
      subscribe: () => {},
    }

    const mockDb: any = {
      table: () => ({
        where: () => ({
          first: async () => null,
          select: async () => [],
          update: async () => {},
          delete: async () => {},
        }),
        insert: async () => {},
        offset: () => ({ limit: () => ({ select: async () => [] }) }),
        limit: () => ({ select: async () => [] }),
        count: async () => 0,
      }),
    }

    const repository = new PostRepository(mockDb, mockDispatcher)

    const title = Title.create('Integration Event Test')
    const content = Content.create('Testing ACL conversion')
    const post = Post.create('post-ie-test', title, content, 'author-ie-test')

    await repository.save(post)

    // 應該有 DomainEvent 和 IntegrationEvent
    expect(dispatchedEvents.length).toBeGreaterThanOrEqual(2)

    // 檢查是否包含 IntegrationEvent
    const integrationEvents = dispatchedEvents.filter(e => 'sourceContext' in e)
    expect(integrationEvents.length).toBeGreaterThan(0)

    const postCreatedIE = integrationEvents.find(e => e.eventType === 'PostCreated')
    expect(postCreatedIE).toBeDefined()
    expect(postCreatedIE?.sourceContext).toBe('Post')
    expect(postCreatedIE?.data.postId).toBe('post-ie-test')
    expect(postCreatedIE?.data.title).toBe('Integration Event Test')
    expect(postCreatedIE?.data.authorId).toBe('author-ie-test')
  })
})
