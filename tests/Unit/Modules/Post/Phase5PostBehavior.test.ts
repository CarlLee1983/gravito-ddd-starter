/**
 * @file Phase5PostBehavior.test.ts
 * @description Post 聚合根行為擴展 - Phase 5 測試
 *
 * 測試 Post.publish()、Post.archive() 和 Post.changeTitle() 方法：
 * - 事件發佈機制
 * - 狀態轉換規則
 * - 業務規則驗證
 * - 不可變性
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { Post } from '@/Modules/Post/Domain/Aggregates/Post'
import { Title } from '@/Modules/Post/Domain/ValueObjects/Title'
import { Content } from '@/Modules/Post/Domain/ValueObjects/Content'
import { PostPublished } from '@/Modules/Post/Domain/Events/PostPublished'
import { PostArchived } from '@/Modules/Post/Domain/Events/PostArchived'
import { PostTitleChanged } from '@/Modules/Post/Domain/Events/PostTitleChanged'

describe('Phase 5: Post 聚合根行為擴展', () => {
  let post: Post
  let newTitle: Title

  beforeEach(() => {
    // 建立新文章
    const title = Title.create('Original Title')
    const content = Content.create('Some content')
    post = Post.create('post-1', title, content, 'author-1')

    // 清除建立事件
    post.getUncommittedEvents()
    post.markEventsAsCommitted()

    newTitle = Title.create('Updated Title')
  })

  // ============ publish() 測試 ============

  describe('publish() - 文章發佈', () => {
    it('應該成功發佈文章並發佈 PostPublished 事件', () => {
      post.publish()

      const events = post.getUncommittedEvents()
      expect(events.length).toBe(1)
      expect(events[0]).toBeInstanceOf(PostPublished)
      expect((events[0] as PostPublished).postId).toBe('post-1')
      expect((events[0] as PostPublished).authorId).toBe('author-1')
    })

    it('應該更新文章的 isPublished 狀態', () => {
      expect(post.isPublished).toBe(false)
      post.publish()
      expect(post.isPublished).toBe(true)
    })

    it('已發佈的文章無法再次發佈', () => {
      post.publish()
      post.markEventsAsCommitted()

      expect(() => {
        post.publish()
      }).toThrow('文章已發佈，無法重複發佈')
    })

    it('已存檔的文章無法發佈', () => {
      post.archive()
      post.markEventsAsCommitted()

      expect(() => {
        post.publish()
      }).toThrow('已存檔的文章無法發佈')
    })

    it('事件應該正確序列化為 JSON', () => {
      post.publish()
      const event = post.getUncommittedEvents()[0] as PostPublished
      const json = event.toJSON()

      expect(json.eventType).toBe('PostPublished')
      expect((json.data as any).postId).toBe('post-1')
      expect((json.data as any).authorId).toBe('author-1')
      expect(json.eventId).toBeDefined()
      expect(json.version).toBe(1)
    })
  })

  // ============ archive() 測試 ============

  describe('archive() - 文章存檔', () => {
    it('應該成功存檔文章並發佈 PostArchived 事件', () => {
      post.archive()

      const events = post.getUncommittedEvents()
      expect(events.length).toBe(1)
      expect(events[0]).toBeInstanceOf(PostArchived)
      expect((events[0] as PostArchived).postId).toBe('post-1')
    })

    it('應該更新文章的 isArchived 狀態', () => {
      expect(post.isArchived).toBe(false)
      post.archive()
      expect(post.isArchived).toBe(true)
    })

    it('已存檔的文章無法再次存檔', () => {
      post.archive()
      post.markEventsAsCommitted()

      expect(() => {
        post.archive()
      }).toThrow('文章已存檔，無法重複存檔')
    })

    it('已發佈的文章仍可存檔', () => {
      post.publish()
      post.markEventsAsCommitted()

      post.archive()
      expect(post.isArchived).toBe(true)
      expect(post.isPublished).toBe(true)
    })

    it('事件應該正確序列化為 JSON', () => {
      post.archive()
      const event = post.getUncommittedEvents()[0] as PostArchived
      const json = event.toJSON()

      expect(json.eventType).toBe('PostArchived')
      expect((json.data as any).postId).toBe('post-1')
      expect((json.data as any).authorId).toBe('author-1')
      expect(json.eventId).toBeDefined()
      expect(json.version).toBe(1)
    })
  })

  // ============ changeTitle() 測試 ============

  describe('changeTitle() - 文章標題變更', () => {
    it('應該成功變更標題並發佈 PostTitleChanged 事件', () => {
      post.changeTitle(newTitle)

      const events = post.getUncommittedEvents()
      expect(events.length).toBe(1)
      expect(events[0]).toBeInstanceOf(PostTitleChanged)
      expect((events[0] as PostTitleChanged).newTitle).toBe('Updated Title')
      expect((events[0] as PostTitleChanged).oldTitle).toBe('Original Title')
    })

    it('應該更新文章的 title 狀態', () => {
      expect(post.title.value).toBe('Original Title')
      post.changeTitle(newTitle)
      expect(post.title.value).toBe('Updated Title')
    })

    it('如果標題相同，應該不發佈事件', () => {
      const sameTitle = Title.create(post.title.value)
      post.changeTitle(sameTitle)

      const events = post.getUncommittedEvents()
      expect(events.length).toBe(0)
    })

    it('已存檔的文章無法變更標題', () => {
      post.archive()
      post.markEventsAsCommitted()

      expect(() => {
        post.changeTitle(newTitle)
      }).toThrow('已存檔的文章無法變更標題')
    })

    it('已發佈的文章仍可變更標題', () => {
      post.publish()
      post.markEventsAsCommitted()

      post.changeTitle(newTitle)
      expect(post.title.value).toBe('Updated Title')
    })

    it('應該支持連續變更標題', () => {
      const title1 = Title.create('Title 1')
      const title2 = Title.create('Title 2')

      post.changeTitle(title1)
      expect(post.getUncommittedEvents().length).toBe(1)
      post.markEventsAsCommitted()

      post.changeTitle(title2)
      expect(post.getUncommittedEvents().length).toBe(1)
      expect(post.title.value).toBe('Title 2')
    })

    it('事件應該正確序列化為 JSON', () => {
      post.changeTitle(newTitle)
      const event = post.getUncommittedEvents()[0] as PostTitleChanged
      const json = event.toJSON()

      expect(json.eventType).toBe('PostTitleChanged')
      expect((json.data as any).oldTitle).toBe('Original Title')
      expect((json.data as any).newTitle).toBe('Updated Title')
      expect(json.eventId).toBeDefined()
      expect(json.version).toBe(1)
    })
  })

  // ============ 狀態轉換規則 ============

  describe('狀態轉換規則', () => {
    it('新建文章應該既未發佈也未存檔', () => {
      const freshPost = Post.create('post-2', Title.create('Fresh'), Content.create('Content'), 'author-1')
      expect(freshPost.isPublished).toBe(false)
      expect(freshPost.isArchived).toBe(false)
    })

    it('應該支持：草稿 → 發佈', () => {
      expect(post.isPublished).toBe(false)
      post.publish()
      expect(post.isPublished).toBe(true)
    })

    it('應該支持：草稿 → 存檔', () => {
      expect(post.isArchived).toBe(false)
      post.archive()
      expect(post.isArchived).toBe(true)
    })

    it('應該支持：發佈 → 存檔', () => {
      post.publish()
      post.markEventsAsCommitted()

      post.archive()
      expect(post.isPublished).toBe(true)
      expect(post.isArchived).toBe(true)
    })

    it('應該阻止：存檔 → 發佈', () => {
      post.archive()
      post.markEventsAsCommitted()

      expect(() => {
        post.publish()
      }).toThrow()
    })

    it('應該阻止：存檔 → 變更標題', () => {
      post.archive()
      post.markEventsAsCommitted()

      expect(() => {
        post.changeTitle(newTitle)
      }).toThrow()
    })

    it('應該允許：發佈狀態下變更標題', () => {
      post.publish()
      post.markEventsAsCommitted()

      const originalTitle = post.title.value
      post.changeTitle(newTitle)

      expect(post.title.value).toBe('Updated Title')
      const events = post.getUncommittedEvents()
      const titleChangeEvent = events[0] as PostTitleChanged
      expect(titleChangeEvent.oldTitle).toBe(originalTitle)
    })
  })

  // ============ 組合行為 ============

  describe('組合行為', () => {
    it('應該支持發佈後變更標題', () => {
      post.publish()
      post.changeTitle(newTitle)

      const events = post.getUncommittedEvents()
      expect(events.length).toBe(2)
      expect(events[0]).toBeInstanceOf(PostPublished)
      expect(events[1]).toBeInstanceOf(PostTitleChanged)

      expect(post.isPublished).toBe(true)
      expect(post.title.value).toBe('Updated Title')
    })

    it('應該支持發佈、變更標題、再存檔', () => {
      post.publish()
      post.changeTitle(newTitle)
      post.archive()

      const events = post.getUncommittedEvents()
      expect(events.length).toBe(3)

      expect(post.isPublished).toBe(true)
      expect(post.title.value).toBe('Updated Title')
      expect(post.isArchived).toBe(true)
    })
  })

  // ============ 事件重放（Event Sourcing）============

  describe('事件重放', () => {
    it('應該透過重放 PostPublished 事件重建狀態', () => {
      post.publish()
      const events = post.getUncommittedEvents()

      // 建立新文章並重放事件
      const post2 = Post.reconstitute('post-1', post.title, post.content, post.authorId, post.createdAt)
      post2.applyEvent(events[0])

      expect(post2.isPublished).toBe(true)
    })

    it('應該透過重放 PostArchived 事件重建狀態', () => {
      post.archive()
      const events = post.getUncommittedEvents()

      // 建立新文章並重放事件
      const post2 = Post.reconstitute('post-1', post.title, post.content, post.authorId, post.createdAt)
      post2.applyEvent(events[0])

      expect(post2.isArchived).toBe(true)
    })

    it('應該透過重放 PostTitleChanged 事件重建狀態', () => {
      post.changeTitle(newTitle)
      const events = post.getUncommittedEvents()

      // 建立新文章並重放事件
      const originalTitle = Title.create('Original Title')
      let post2 = Post.reconstitute('post-1', originalTitle, post.content, post.authorId, post.createdAt)
      post2.applyEvent(events[0])

      expect(post2.title.value).toBe('Updated Title')
    })

    it('應該支持多事件重放', () => {
      post.publish()
      post.changeTitle(newTitle)
      post.archive()
      const events = post.getUncommittedEvents()

      // 建立新文章
      const post2 = Post.reconstitute(
        'post-1',
        Title.create('Original Title'),
        post.content,
        post.authorId,
        post.createdAt
      )

      // 重放所有事件
      events.forEach(event => post2.applyEvent(event))

      expect(post2.isPublished).toBe(true)
      expect(post2.title.value).toBe('Updated Title')
      expect(post2.isArchived).toBe(true)
    })
  })

  // ============ Getters ============

  describe('狀態 Getters', () => {
    it('isPublished getter 應該反映發佈狀態', () => {
      expect(post.isPublished).toBe(false)
      post.publish()
      expect(post.isPublished).toBe(true)
    })

    it('isArchived getter 應該反映存檔狀態', () => {
      expect(post.isArchived).toBe(false)
      post.archive()
      expect(post.isArchived).toBe(true)
    })
  })
})
