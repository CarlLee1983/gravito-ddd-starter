/**
 * @file P3BOptimisticLock.test.ts
 * @description Post Repository 樂觀鎖測試 (P3B)
 *
 * 驗證版本衝突保護機制
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { PostRepository } from '@/Modules/Post/Infrastructure/Repositories/PostRepository'
import { Post } from '@/Modules/Post/Domain/Aggregates/Post'
import { Title } from '@/Modules/Post/Domain/ValueObjects/Title'
import { Content } from '@/Modules/Post/Domain/ValueObjects/Content'
import { OptimisticLockException } from '@/Shared/Application/OptimisticLockException'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'

describe('Post Repository - Optimistic Lock (P3B)', () => {
  let repository: PostRepository
  let db: MemoryDatabaseAccess

  beforeEach(() => {
    db = new MemoryDatabaseAccess()
    repository = new PostRepository(db)
  })

  describe('version field initialization', () => {
    it('新建文章應初始化版本為 0', async () => {
      const post = Post.create('post-1', Title.create('Hello World'), Content.create('Content here'), 'user-1')
      await repository.save(post)

      const row = await db.table('posts').where('id', '=', 'post-1').first()
      expect(row?.version).toBe(0)
    })
  })

  describe('version increment on update', () => {
    beforeEach(async () => {
      const post = Post.create('post-1', Title.create('Hello World'), Content.create('Content here'), 'user-1')
      await repository.save(post)
    })

    it('更新後版本應遞增', async () => {
      let post = await repository.findById('post-1')
      expect(post).not.toBeNull()

      if (post) {
        post.publish()
        await repository.save(post)
      }

      const row = await db.table('posts').where('id', '=', 'post-1').first()
      expect(row?.version).toBe(1)
    })

    it('多次更新應持續遞增版本', async () => {
      // 第 1 次更新
      let post = await repository.findById('post-1')
      if (post) {
        post.publish()
        await repository.save(post)
      }

      let row = await db.table('posts').where('id', '=', 'post-1').first()
      expect(row?.version).toBe(1)

      // 第 2 次更新
      post = await repository.findById('post-1')
      if (post) {
        post.archive()
        await repository.save(post)
      }

      row = await db.table('posts').where('id', '=', 'post-1').first()
      expect(row?.version).toBe(2)
    })
  })

  describe('OptimisticLockException', () => {
    it('應可以正常創建異常', () => {
      const error = new OptimisticLockException('Post', 'post-1', 5)

      expect(error).toBeInstanceOf(OptimisticLockException)
      expect(error.name).toBe('OptimisticLockException')
      expect(error.aggregateType).toBe('Post')
      expect(error.aggregateId).toBe('post-1')
      expect(error.expectedVersion).toBe(5)
      expect(error.message).toContain('版本衝突')
    })

    it('異常訊息應包含重要資訊', () => {
      const error = new OptimisticLockException('Post', 'my-post', 3)

      expect(error.message).toContain('my-post')
      expect(error.message).toContain('3')
    })
  })
})
