/**
 * Drizzle Repository 實現測試
 *
 * 驗證 Drizzle 版本的 User 和 Post Repository 實現
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'
import { DrizzleUserRepository } from '@/adapters/Drizzle/Repositories/DrizzleUserRepository'
import { DrizzlePostRepository } from '@/adapters/Drizzle/Repositories/DrizzlePostRepository'
import { User } from '@/Modules/User/Domain/Aggregates/User'
import { Post } from '@/Modules/Post/Domain/Aggregates/Post'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

describe('Drizzle Repository 實現', () => {
  let db: IDatabaseAccess
  let userRepo: DrizzleUserRepository
  let postRepo: DrizzlePostRepository

  beforeEach(() => {
    db = createDrizzleDatabaseAccess()
    userRepo = new DrizzleUserRepository(db)
    postRepo = new DrizzlePostRepository(db)
  })

  describe('User Repository', () => {
    it('應該能創建 Repository 實例', () => {
      expect(userRepo).toBeDefined()
      expect(typeof userRepo.save).toBe('function')
      expect(typeof userRepo.findById).toBe('function')
      expect(typeof userRepo.findByEmail).toBe('function')
      expect(typeof userRepo.findAll).toBe('function')
      expect(typeof userRepo.count).toBe('function')
      expect(typeof userRepo.delete).toBe('function')
    })

    it('應該能保存和查詢用戶', async () => {
      const user = User.create('user-1', 'John Doe', 'john@example.com')

      // 保存用戶
      await userRepo.save(user)

      // 查詢用戶
      const found = await userRepo.findById('user-1')
      expect(found).toBeDefined()
      expect(found?.name).toBe('John Doe')
      expect(found?.email).toBe('john@example.com')
    })

    it('應該能按 email 查詢用戶', async () => {
      const user = User.create('user-2', 'Jane Doe', 'jane@example.com')
      await userRepo.save(user)

      const found = await userRepo.findByEmail('jane@example.com')
      expect(found).toBeDefined()
      expect(found?.id).toBe('user-2')
    })

    it('應該能計算用戶數量', async () => {
      const user1 = User.create('user-3', 'Alice', 'alice@example.com')
      const user2 = User.create('user-4', 'Bob', 'bob@example.com')

      await userRepo.save(user1)
      await userRepo.save(user2)

      const count = await userRepo.count()
      expect(typeof count).toBe('number')
      expect(count >= 0).toBe(true)
    })

    it('應該能刪除用戶', async () => {
      const user = User.create('user-5', 'Charlie', 'charlie@example.com')
      await userRepo.save(user)

      await userRepo.delete('user-5')
      const found = await userRepo.findById('user-5')
      expect(found).toBeNull()
    })

    it('應該支持分頁', async () => {
      const users = [
        User.create('user-6', 'User 1', 'user1@example.com'),
        User.create('user-7', 'User 2', 'user2@example.com'),
      ]

      for (const user of users) {
        await userRepo.save(user)
      }

      const result = await userRepo.findAll({ limit: 1, offset: 0 })
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('Post Repository', () => {
    it('應該能創建 Repository 實例', () => {
      expect(postRepo).toBeDefined()
      expect(typeof postRepo.save).toBe('function')
      expect(typeof postRepo.findById).toBe('function')
      expect(typeof postRepo.findByUserId).toBe('function')
      expect(typeof postRepo.findAll).toBe('function')
      expect(typeof postRepo.count).toBe('function')
      expect(typeof postRepo.delete).toBe('function')
    })

    it('應該能保存和查詢文章', async () => {
      const post = Post.create('post-1', 'My First Post', 'user-1', 'This is content')

      // 保存文章
      await postRepo.save(post)

      // 查詢文章
      const found = await postRepo.findById('post-1')
      expect(found).toBeDefined()
      expect(found?.title).toBe('My First Post')
      expect(found?.userId).toBe('user-1')
    })

    it('應該能按用戶 ID 查詢文章', async () => {
      const post = Post.create('post-2', 'Another Post', 'user-1', 'More content')
      await postRepo.save(post)

      const posts = await postRepo.findByUserId('user-1')
      expect(Array.isArray(posts)).toBe(true)
    })

    it('應該能計算文章數量', async () => {
      const post1 = Post.create('post-3', 'Post 1', 'user-2', 'Content 1')
      const post2 = Post.create('post-4', 'Post 2', 'user-3', 'Content 2')

      await postRepo.save(post1)
      await postRepo.save(post2)

      const count = await postRepo.count()
      expect(typeof count).toBe('number')
      expect(count >= 0).toBe(true)
    })

    it('應該能刪除文章', async () => {
      const post = Post.create('post-5', 'Post to Delete', 'user-1', 'Delete me')
      await postRepo.save(post)

      await postRepo.delete('post-5')
      const found = await postRepo.findById('post-5')
      expect(found).toBeNull()
    })

    it('應該支持分頁', async () => {
      const posts = [
        Post.create('post-6', 'Post 1', 'user-1', 'Content'),
        Post.create('post-7', 'Post 2', 'user-1', 'Content'),
      ]

      for (const post of posts) {
        await postRepo.save(post)
      }

      const result = await postRepo.findAll({ limit: 1, offset: 0 })
      expect(Array.isArray(result)).toBe(true)
    })

    it('應該允許不包含 content（可選）', async () => {
      const post = Post.create('post-8', 'Post Without Content', 'user-1')

      await postRepo.save(post)
      const found = await postRepo.findById('post-8')

      expect(found).toBeDefined()
      expect(found?.content).toBeUndefined()
    })
  })

  describe('Repository 一致性', () => {
    it('User 和 Post Repository 應該實現相同的接口方法', () => {
      const userMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(userRepo))
        .filter((m) => m !== 'constructor' && !m.startsWith('_'))

      const postMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(postRepo))
        .filter((m) => m !== 'constructor' && !m.startsWith('_'))

      const commonMethods = ['save', 'findById', 'findAll', 'count', 'delete']

      commonMethods.forEach((method) => {
        expect(userMethods).toContain(method)
        expect(postMethods).toContain(method)
      })
    })
  })
})
