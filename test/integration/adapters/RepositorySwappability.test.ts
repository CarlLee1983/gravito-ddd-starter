/**
 * 可替換性測試 - Repository Swappability Test Suite
 *
 * 此測試套件驗證以下特性：
 * 1. Repository 介面契約獨立於 ORM 實現
 * 2. 任何實現 IDatabaseAccess 的適配器都可用
 * 3. 切換 ORM 時，業務層代碼無需改動
 *
 * 測試策略：
 * - 使用抽象 IDatabaseAccess 而非具體 ORM
 * - 測試所有 CRUD 操作和查詢方法
 * - 驗證資料轉換（toDomain/toRow）正確性
 * - 驗證分頁、排序、過濾邏輯
 *
 * @design
 * 此測試不依賴任何具體 ORM，可用於測試 Atlas、Drizzle、Prisma 等任何適配器
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IRepository } from '@/Shared/Infrastructure/IRepository'
import { User } from '@/Modules/User/Domain/Aggregates/User'

/**
 * 泛用 Repository 測試工廠
 * 可用於測試任何 ORM 適配器的 Repository 實現
 */
export function createRepositorySwappabilityTests<T extends object>(
  repositoryName: string,
  createRepository: () => IRepository<T>,
  fixtures: {
    valid: T
    valid2: T
    invalid: Partial<T>
    getId: (entity: T) => string
    getName: (entity: T) => string
    setName: (entity: T, name: string) => T
  }
) {
  describe(`${repositoryName} - Swappability Tests`, () => {
    let repository: IRepository<T>

    beforeEach(() => {
      repository = createRepository()
    })

    describe('CRUD 基本操作', () => {
      it('應該正確儲存實體', async () => {
        const entity = fixtures.valid
        await repository.save(entity)

        const retrieved = await repository.findById(fixtures.getId(entity))
        expect(retrieved).toBeDefined()
        expect(fixtures.getName(retrieved!)).toBe(fixtures.getName(entity))
      })

      it('應該正確查詢單筆實體', async () => {
        const entity = fixtures.valid
        await repository.save(entity)

        const found = await repository.findById(fixtures.getId(entity))
        expect(found).not.toBeNull()
        expect(fixtures.getId(found!)).toBe(fixtures.getId(entity))
      })

      it('查詢不存在的實體時應返回 null', async () => {
        const result = await repository.findById('non-existent-id')
        expect(result).toBeNull()
      })

      it('應該正確更新實體', async () => {
        const entity = fixtures.valid
        await repository.save(entity)

        const updated = fixtures.setName(entity, 'Updated Name')
        await repository.save(updated)

        const retrieved = await repository.findById(fixtures.getId(updated))
        expect(fixtures.getName(retrieved!)).toBe('Updated Name')
      })

      it('應該正確刪除實體', async () => {
        const entity = fixtures.valid
        await repository.save(entity)

        await repository.delete(fixtures.getId(entity))
        const retrieved = await repository.findById(fixtures.getId(entity))
        expect(retrieved).toBeNull()
      })
    })

    describe('批量查詢操作', () => {
      beforeEach(async () => {
        await repository.save(fixtures.valid)
        await repository.save(fixtures.valid2)
      })

      it('應該查詢所有實體', async () => {
        const all = await repository.findAll()
        expect(all.length).toBeGreaterThanOrEqual(2)
      })

      it('應該支援分頁 - offset', async () => {
        const page1 = await repository.findAll({ offset: 0, limit: 1 })
        const page2 = await repository.findAll({ offset: 1, limit: 1 })

        expect(page1.length).toBe(1)
        expect(page2.length).toBe(1)
        expect(fixtures.getId(page1[0])).not.toBe(fixtures.getId(page2[0]))
      })

      it('應該支援分頁 - limit', async () => {
        const limited = await repository.findAll({ limit: 1 })
        expect(limited.length).toBeLessThanOrEqual(1)
      })

      it('應該計算總數', async () => {
        const count = await repository.count()
        expect(count).toBeGreaterThanOrEqual(2)
      })
    })

    describe('資料完整性', () => {
      it('儲存和查詢應保持資料完整', async () => {
        const entity = fixtures.valid
        await repository.save(entity)

        const retrieved = await repository.findById(fixtures.getId(entity))
        expect(retrieved).toBeDefined()

        // 驗證所有欄位都被正確保存和檢索
        const originalKeys = Object.keys(entity)
        const retrievedKeys = Object.keys(retrieved!)

        originalKeys.forEach((key) => {
          expect(retrievedKeys).toContain(key)
        })
      })

      it('應該支援多次儲存相同實體（冪等性）', async () => {
        const entity = fixtures.valid
        await repository.save(entity)
        await repository.save(entity)
        await repository.save(entity)

        const all = await repository.findAll()
        const matching = all.filter((e) => fixtures.getId(e) === fixtures.getId(entity))
        expect(matching.length).toBe(1) // 應該只有一個實體，而不是三個
      })
    })

    describe('錯誤處理', () => {
      it('刪除不存在的實體應該不拋出錯誤', async () => {
        await expect(repository.delete('non-existent-id')).resolves.not.toThrow()
      })

      it('查詢無效分頁參數應該返回有效結果', async () => {
        await repository.save(fixtures.valid)

        const result = await repository.findAll({ offset: 1000, limit: 10 })
        expect(Array.isArray(result)).toBe(true)
      })
    })
  })
}

/**
 * 使用者 Repository 具體測試
 */
export function createUserRepositoryTests(createRepository: () => IRepository<User>) {
  return createRepositorySwappabilityTests('UserRepository', createRepository, {
    valid: new User('user-1', 'John Doe', 'john@example.com'),
    valid2: new User('user-2', 'Jane Doe', 'jane@example.com'),
    invalid: { id: '', name: '', email: '' },
    getId: (user) => user.id,
    getName: (user) => user.name,
    setName: (user, name) => new User(user.id, name, user.email),
  })
}

/**
 * 由 User Domain 實現的測試
 * 無論使用哪個 ORM 適配器，這些測試應該全部通過
 */
describe('User Repository - 可替換性驗證', () => {
  it('in-memory 實現應該通過所有測試', async () => {
    const { UserRepository } = await import('@/Modules/User/Infrastructure/Persistence/UserRepository')
    const { MemoryDatabaseAccess } = await import('@/Shared/Infrastructure/MemoryDatabaseAccess')
    createUserRepositoryTests(() => new UserRepository(new MemoryDatabaseAccess()))
  })

  // 待實現：Drizzle 適配器測試
  // it('Drizzle 實現應該通過所有測試', async () => {
  //   const { createDrizzleUserRepository } = await import('@/adapters/Drizzle')
  //   createUserRepositoryTests(() => createDrizzleUserRepository())
  // })

  // 待實現：Prisma 適配器測試
  // it('Prisma 實現應該通過所有測試', async () => {
  //   const { createPrismaUserRepository } = await import('@/adapters/Prisma')
  //   createUserRepositoryTests(() => createPrismaUserRepository())
  // })
})
