/**
 * User Repository - 可替換性驗證
 *
 * 驗證同一個 UserRepository 是否能在不修改代碼的情況下，
 * 透過注入不同的 IDatabaseAccess 實現，在 Memory 和真實資料庫之間切換。
 *
 * @module test/integration/adapters/RepositorySwappability
 */

import { describe, it, expect } from 'bun:test'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { createDrizzleDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Drizzle'
import { createAtlasDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Atlas'
import { UserRepository } from '@/Modules/User/Infrastructure/Persistence/UserRepository'
import { User } from '@/Modules/User/Domain/Aggregates/User'

describe('User Repository - 可替換性驗證', () => {
  // 定義一組要測試的適配器
  const databaseAccessConfigs = [
    { name: 'Memory', create: () => new MemoryDatabaseAccess() },
    { name: 'Drizzle', create: createDrizzleDatabaseAccess },
    { name: 'Atlas', create: createAtlasDatabaseAccess }
  ]

  for (const { name, create } of databaseAccessConfigs) {
    describe(`${name} 驅動下的 UserRepository`, () => {
      let repository: UserRepository
      let db: IDatabaseAccess

      it('應該能正確保存並查詢用戶', async () => {
        db = create()
        repository = new UserRepository(db)
        
        const testId = `repo-swap-${name}-${Date.now()}`
        const user = User.create(testId, `${name} User`, `${testId}@example.com`)
        
        // 1. 保存
        await repository.save(user)
        
        // 2. 按 ID 查詢
        const found = await repository.findById(testId)
        expect(found).toBeDefined()
        expect(found?.name).toBe(`${name} User`)
        expect(found?.email).toBe(`${testId}@example.com`)
        
        // 3. 按 Email 查詢
        const foundByEmail = await repository.findByEmail(`${testId}@example.com`)
        expect(foundByEmail?.id).toBe(testId)
        
        // 4. 更新
        const updatedUser = User.fromDatabase({
          id: testId,
          name: `Updated ${name}`,
          email: `${testId}@example.com`,
          created_at: user.createdAt
        })
        await repository.save(updatedUser)
        
        const foundUpdated = await repository.findById(testId)
        expect(foundUpdated?.name).toBe(`Updated ${name}`)
        
        // 5. 刪除
        await repository.delete(testId)
        const foundDeleted = await repository.findById(testId)
        expect(foundDeleted).toBeNull()
      })
    })
  }

  it('應該能在同一個生命週期中切換底層儲存而不影響業務代碼', async () => {
    // 模擬業務邏輯 (只依賴 IUserRepository 介面)
    async function performBusinessTask(repo: UserRepository, id: string) {
      const user = User.create(id, 'Business User', `${id}@biz.com`)
      await repo.save(user)
      return repo.findById(id)
    }

    const memoryDb = new MemoryDatabaseAccess()
    const drizzleDb = createDrizzleDatabaseAccess()

    // 使用同一個 Repository 類別，但注入不同的 DB 實作
    const memoryRepo = new UserRepository(memoryDb)
    const drizzleRepo = new UserRepository(drizzleDb)

    const user1 = await performBusinessTask(memoryRepo, 'id-1')
    const user2 = await performBusinessTask(drizzleRepo, 'id-2')

    expect(user1?.name).toBe('Business User')
    expect(user2?.name).toBe('Business User')
  })
})
