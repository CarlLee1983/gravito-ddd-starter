/**
 * @file P3CCQRS.test.ts
 * @description Post Service CQRS 讀側測試 (P3C)
 *
 * 驗證 GetPostService 實現 IPostQueryService 介面
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { GetPostService } from '@/Modules/Post/Application/Services/GetPostService'
import { Post } from '@/Modules/Post/Domain/Aggregates/Post'
import { Title } from '@/Modules/Post/Domain/ValueObjects/Title'
import { Content } from '@/Modules/Post/Domain/ValueObjects/Content'
import { AuthorInfo } from '@/Modules/Post/Domain/ValueObjects/AuthorInfo'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { PostRepository } from '@/Modules/Post/Infrastructure/Repositories/PostRepository'
import type { PostReadModel } from '@/Modules/Post/Application/ReadModels/PostReadModel'
import type { IPostQueryService } from '@/Modules/Post/Application/Queries/IPostQueryService'
import type { IAuthorService } from '@/Modules/Post/Domain/Services/IAuthorService'

// Mock IAuthorService
const mockAuthorService: IAuthorService = {
	findAuthor: async (id: string) => new AuthorInfo(id, 'Mock Author', 'mock@example.com'),
}

describe('Post Service - CQRS (P3C)', () => {
  let queryService: GetPostService
  let repository: PostRepository
  let db: MemoryDatabaseAccess

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    repository = new PostRepository(db)
    queryService = new GetPostService(repository, mockAuthorService)

    // 準備測試資料
    const post1 = Post.create('post-1', Title.create('First Post'), Content.create('Content 1'), 'user-1')
    const post2 = Post.create('post-2', Title.create('Second Post'), Content.create('Content 2'), 'user-1')
    const post3 = Post.create('post-3', Title.create('Third Post'), Content.create('Content 3'), 'user-2')
    await repository.save(post1)
    await repository.save(post2)
    await repository.save(post3)
  })

  describe('IQuerySide interface implementation', () => {
    it('應實現 IPostQueryService 介面', () => {
      // 驗證接口方法存在
      expect(queryService).toHaveProperty('findById')
      expect(queryService).toHaveProperty('findAll')
      expect(queryService).toHaveProperty('count')
      expect(queryService).toHaveProperty('findByTitle')
      expect(queryService).toHaveProperty('findByAuthor')
    })

    it('findById() 應回傳 PostReadModel', async () => {
      const readModel = await queryService.findById('post-1')

      expect(readModel).not.toBeNull()
      if (readModel) {
        expect(readModel).toHaveProperty('id')
        expect(readModel).toHaveProperty('title')
        expect(readModel).toHaveProperty('content')
        expect(readModel).toHaveProperty('authorId')
        expect(readModel).toHaveProperty('isPublished')
        expect(readModel).toHaveProperty('isArchived')
        expect(readModel).toHaveProperty('createdAt')
        expect(readModel.id).toBe('post-1')
        expect(readModel.title).toBe('First Post')
      }
    })

    it('findAll() 應回傳 PostReadModel 陣列', async () => {
      const readModels = await queryService.findAll()

      expect(Array.isArray(readModels)).toBe(true)
      expect(readModels.length).toBeGreaterThan(0)
      expect(readModels[0]).toHaveProperty('id')
      expect(readModels[0]).toHaveProperty('title')
      expect(readModels[0]).toHaveProperty('authorId')
    })

    it('findAll() 應支援分頁參數', async () => {
      const readModels = await queryService.findAll({ limit: 1, offset: 0 })

      expect(readModels.length).toBeLessThanOrEqual(1)
    })

    it('count() 應回傳文章總數', async () => {
      const count = await queryService.count()

      expect(typeof count).toBe('number')
      expect(count).toBe(3)
    })

    it('findByTitle() 應回傳 PostReadModel', async () => {
      const readModel = await queryService.findByTitle('First Post')

      expect(readModel).not.toBeNull()
      if (readModel) {
        expect(readModel.title).toBe('First Post')
        expect(readModel.id).toBe('post-1')
      }
    })

    it('findByAuthor() 應回傳特定作者的所有文章', async () => {
      const readModels = await queryService.findByAuthor('user-1')

      expect(Array.isArray(readModels)).toBe(true)
      expect(readModels.length).toBe(2)
      expect(readModels.every(m => m.authorId === 'user-1')).toBe(true)
    })
  })

  describe('ReadModel structure', () => {
    it('ReadModel 應包含必要的屬性', async () => {
      const readModel = await queryService.findById('post-1')

      expect(readModel).not.toBeNull()
      if (readModel) {
        const requiredFields: (keyof PostReadModel)[] = [
          'id',
          'title',
          'content',
          'authorId',
          'isPublished',
          'isArchived',
          'createdAt',
        ]
        for (const field of requiredFields) {
          expect(readModel).toHaveProperty(field)
        }
      }
    })

    it('ReadModel 應只包含讀側必要的資料', async () => {
      const readModel = await queryService.findById('post-1')

      expect(readModel).not.toBeNull()
      if (readModel) {
        const modelKeys = Object.keys(readModel)
        // ReadModel 不應包含內部實現細節
        expect(modelKeys).not.toContain('_id')
        expect(modelKeys).not.toContain('_title')
      }
    })

    it('isPublished 和 isArchived 應為布林值', async () => {
      const readModel = await queryService.findById('post-1')

      expect(readModel).not.toBeNull()
      if (readModel) {
        expect(typeof readModel.isPublished).toBe('boolean')
        expect(typeof readModel.isArchived).toBe('boolean')
      }
    })

    it('createdAt 應為 ISO 8601 字串', async () => {
      const readModel = await queryService.findById('post-1')

      expect(readModel).not.toBeNull()
      if (readModel) {
        // 驗證可解析為 Date
        const date = new Date(readModel.createdAt)
        expect(date.getTime()).toBeGreaterThan(0)
      }
    })
  })

  describe('query functionality', () => {
    it('findAll() 應回傳所有文章', async () => {
      const readModels = await queryService.findAll()

      expect(readModels.length).toBe(3)
    })

    it('findAll() with limit 應限制結果數量', async () => {
      const readModels = await queryService.findAll({ limit: 2 })

      expect(readModels.length).toBeLessThanOrEqual(2)
    })

    it('findByTitle() 不存在時應回傳 null', async () => {
      const readModel = await queryService.findByTitle('Nonexistent Title')

      expect(readModel).toBeNull()
    })

    it('findById() 不存在時應回傳 null', async () => {
      const readModel = await queryService.findById('non-existent-id')

      expect(readModel).toBeNull()
    })

    it('findByAuthor() 無相關文章時應回傳空陣列', async () => {
      const readModels = await queryService.findByAuthor('user-999')

      expect(Array.isArray(readModels)).toBe(true)
      expect(readModels.length).toBe(0)
    })
  })
})
