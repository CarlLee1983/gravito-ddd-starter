/**
 * @file P3CCQRS.test.ts
 * @description User Service CQRS 讀側測試 (P3C)
 *
 * 驗證 GetUserService 實現 IUserQueryService 介面
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { GetUserService } from '@/Modules/User/Application/Services/GetUserService'
import { User } from '@/Modules/User/Domain/Aggregates/User'
import { Email } from '@/Modules/User/Domain/ValueObjects/Email'
import { UserName } from '@/Modules/User/Domain/ValueObjects/UserName'
import { MemoryDatabaseAccess } from '@/Foundation/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { UserRepository } from '@/Modules/User/Infrastructure/Persistence/UserRepository'
import type { UserReadModel } from '@/Modules/User/Application/ReadModels/UserReadModel'
import type { IUserQueryService } from '@/Modules/User/Application/Queries/IUserQueryService'

describe('User Service - CQRS (P3C)', () => {
  let queryService: GetUserService
  let repository: UserRepository
  let db: MemoryDatabaseAccess

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    repository = new UserRepository(db)
    queryService = new GetUserService(repository)

    // 準備測試資料
    const user1 = User.create('user-1', UserName.create('Alice'), Email.create('alice@example.com'))
    const user2 = User.create('user-2', UserName.create('Bob'), Email.create('bob@example.com'))
    await repository.save(user1)
    await repository.save(user2)
  })

  describe('IQuerySide interface implementation', () => {
    it('應實現 IUserQueryService 介面', () => {
      // 驗證接口方法存在
      expect(queryService).toHaveProperty('findById')
      expect(queryService).toHaveProperty('findAll')
      expect(queryService).toHaveProperty('count')
      expect(queryService).toHaveProperty('findByEmail')
    })

    it('findById() 應回傳 UserReadModel', async () => {
      const readModel = await queryService.findById('user-1')

      expect(readModel).not.toBeNull()
      if (readModel) {
        expect(readModel).toHaveProperty('id')
        expect(readModel).toHaveProperty('name')
        expect(readModel).toHaveProperty('email')
        expect(readModel).toHaveProperty('createdAt')
        expect(readModel.id).toBe('user-1')
        expect(readModel.name).toBe('Alice')
        expect(readModel.email).toBe('alice@example.com')
      }
    })

    it('findAll() 應回傳 UserReadModel 陣列', async () => {
      const readModels = await queryService.findAll()

      expect(Array.isArray(readModels)).toBe(true)
      expect(readModels.length).toBeGreaterThan(0)
      expect(readModels[0]).toHaveProperty('id')
      expect(readModels[0]).toHaveProperty('name')
      expect(readModels[0]).toHaveProperty('email')
      expect(readModels[0]).toHaveProperty('createdAt')
    })

    it('findAll() 應支援分頁參數', async () => {
      const readModels = await queryService.findAll({ limit: 1, offset: 0 })

      expect(readModels.length).toBeLessThanOrEqual(1)
    })

    it('count() 應回傳用戶總數', async () => {
      const count = await queryService.count()

      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThan(0)
    })

    it('findByEmail() 應回傳 UserReadModel', async () => {
      const readModel = await queryService.findByEmail('alice@example.com')

      expect(readModel).not.toBeNull()
      if (readModel) {
        expect(readModel.email).toBe('alice@example.com')
        expect(readModel.name).toBe('Alice')
      }
    })
  })

  describe('ReadModel structure', () => {
    it('ReadModel 應包含必要的屬性', async () => {
      const readModel = await queryService.findById('user-1')

      expect(readModel).not.toBeNull()
      if (readModel) {
        const requiredFields: (keyof UserReadModel)[] = ['id', 'name', 'email', 'createdAt']
        for (const field of requiredFields) {
          expect(readModel).toHaveProperty(field)
        }
      }
    })

    it('ReadModel 應只包含讀側必要的資料', async () => {
      const readModel = await queryService.findById('user-1')

      expect(readModel).not.toBeNull()
      if (readModel) {
        const modelKeys = Object.keys(readModel)
        // ReadModel 不應包含內部實現細節
        expect(modelKeys).not.toContain('_id')
        expect(modelKeys).not.toContain('_name')
      }
    })

    it('createdAt 應為 ISO 8601 字串', async () => {
      const readModel = await queryService.findById('user-1')

      expect(readModel).not.toBeNull()
      if (readModel) {
        // 驗證可解析為 Date
        const date = new Date(readModel.createdAt)
        expect(date.getTime()).toBeGreaterThan(0)
      }
    })
  })

  describe('query functionality', () => {
    it('findAll() 應回傳所有用戶', async () => {
      const readModels = await queryService.findAll()

      expect(readModels.length).toBe(2)
    })

    it('findAll() with limit 應限制結果數量', async () => {
      const readModels = await queryService.findAll({ limit: 1 })

      expect(readModels.length).toBeLessThanOrEqual(1)
    })

    it('findByEmail() 不存在時應回傳 null', async () => {
      const readModel = await queryService.findByEmail('nonexistent@example.com')

      expect(readModel).toBeNull()
    })

    it('findById() 不存在時應回傳 null', async () => {
      const readModel = await queryService.findById('non-existent-id')

      expect(readModel).toBeNull()
    })
  })
})
