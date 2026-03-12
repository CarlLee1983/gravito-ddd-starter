/**
 * @file P3AEventStore.test.ts
 * @description Post Repository 事件存儲測試 (P3A)
 *
 * 驗證 PostRepository 保存事件到 EventStore
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { PostRepository } from '@/Modules/Post/Infrastructure/Repositories/PostRepository'
import { Post } from '@/Modules/Post/Domain/Aggregates/Post'
import { Title } from '@/Modules/Post/Domain/ValueObjects/Title'
import { Content } from '@/Modules/Post/Domain/ValueObjects/Content'
import { MemoryEventStore } from '@/Shared/Infrastructure/Database/EventStore'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'

describe('Post Repository - EventStore Integration (P3A)', () => {
  let repository: PostRepository
  let eventStore: MemoryEventStore
  let db: MemoryDatabaseAccess

  beforeEach(() => {
    db = new MemoryDatabaseAccess()
    eventStore = new MemoryEventStore()
    repository = new PostRepository(db, undefined, eventStore)
  })

  describe('save() with EventStore', () => {
    it('應該在保存時將事件追加到 EventStore', async () => {
      const post = Post.create('post-1', Title.create('Hello World'), Content.create('Content here'), 'user-1')

      await repository.save(post)

      const storedEvents = await eventStore.loadByAggregateId('post-1', 'Post')
      expect(storedEvents.length).toBeGreaterThan(0)
      expect(storedEvents[0].aggregateType).toBe('Post')
      expect(storedEvents[0].aggregateVersion).toBe(1)
    })

    it('應該正確序列化事件資料', async () => {
      const post = Post.create('post-1', Title.create('Hello World'), Content.create('Content here'), 'user-1')

      await repository.save(post)

      const storedEvents = await eventStore.loadByAggregateId('post-1')
      expect(storedEvents.length).toBeGreaterThan(0)

      const eventData = JSON.parse(storedEvents[0].eventData)
      expect(eventData).toHaveProperty('aggregateId')
      expect(eventData).toHaveProperty('data')
      expect(eventData.data).toHaveProperty('title')
      expect(eventData.data).toHaveProperty('content')
      expect(eventData.data).toHaveProperty('authorId')
    })

    it('應該遞增事件的 aggregateVersion', async () => {
      const post = Post.create('post-1', Title.create('Hello World'), Content.create('Content here'), 'user-1')
      await repository.save(post)

      // 載入並修改
      const loaded = await repository.findById('post-1')
      expect(loaded).not.toBeNull()

      if (loaded) {
        loaded.publish()
        await repository.save(loaded)
      }

      const storedEvents = await eventStore.loadByAggregateId('post-1')
      // 應該有多個事件，且版本遞增
      const versions = storedEvents.map(e => e.aggregateVersion).sort((a, b) => a - b)
      for (let i = 0; i < versions.length; i++) {
        expect(versions[i]).toBe(i + 1)
      }
    })

    it('新建文章的第一個事件版本應為 1', async () => {
      const post = Post.create('post-1', Title.create('Hello World'), Content.create('Content here'), 'user-1')

      await repository.save(post)

      const storedEvents = await eventStore.loadByAggregateId('post-1')
      expect(storedEvents[0].aggregateVersion).toBe(1)
    })

    it('應該儲存正確的事件類型名稱', async () => {
      const post = Post.create('post-1', Title.create('Hello World'), Content.create('Content here'), 'user-1')

      await repository.save(post)

      const storedEvents = await eventStore.loadByAggregateId('post-1')
      expect(storedEvents[0].eventType).toBe('PostCreated')
    })

    it('應該包含 eventId 和 occurredAt', async () => {
      const post = Post.create('post-1', Title.create('Hello World'), Content.create('Content here'), 'user-1')

      await repository.save(post)

      const storedEvents = await eventStore.loadByAggregateId('post-1')
      expect(storedEvents[0].eventId).toBeDefined()
      expect(storedEvents[0].occurredAt).toBeDefined()
    })
  })

  describe('eventCount consistency', () => {
    it('EventStore 計數應與事件列表長度一致', async () => {
      const post = Post.create('post-1', Title.create('Hello World'), Content.create('Content here'), 'user-1')
      await repository.save(post)

      const count = await eventStore.countByAggregateId('post-1')
      const events = await eventStore.loadByAggregateId('post-1')

      expect(count).toBe(events.length)
    })
  })
})
