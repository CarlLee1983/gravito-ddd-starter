/**
 * 資料庫存取適配器 - 可替換性測試
 *
 * 驗證不同 ORM 適配器 (Atlas, Drizzle) 是否實現了相同的 IDatabaseAccess 介面
 * 並且可以無縫替換，而不需要修改業務代碼。
 *
 * @module test/integration/adapters/DatabaseAccessSwappability
 */

import { describe, it, expect, beforeAll } from 'bun:test'
import type { IDatabaseAccess, IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'
import { createAtlasDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Atlas'
import { createDrizzleDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Drizzle'

describe('資料庫存取適配器 - 可替換性測試', () => {
  const adapters: Array<{ name: string; create: () => IDatabaseAccess }> = [
    { name: 'Atlas (Gravito)', create: createAtlasDatabaseAccess },
    { name: 'Drizzle (SQL)', create: createDrizzleDatabaseAccess },
  ]

  for (const { name, create } of adapters) {
    describe(`${name} 適配器`, () => {
      let db: IDatabaseAccess
      const tableName = 'users'

      beforeAll(() => {
        db = create()
      })

      it('應該實現 IQueryBuilder 的鏈式調用', () => {
        const query = db.table(tableName)
          .where('id', '=', '1')
          .limit(10)
          .offset(0)
        
        expect(query).toBeDefined()
        // 檢查是否返回了 QueryBuilder
        expect(typeof (query as any).first).toBe('function')
        expect(typeof (query as any).select).toBe('function')
      })

      it('應該支援 CRUD 操作的共同語法', async () => {
        const testId = `swappable-${name.split(' ')[0]}-${Date.now()}`
        
        // 1. Insert
        await db.table(tableName).insert({
          id: testId,
          name: `${name} User`,
          email: `${testId}@example.com`
        })

        // 2. Select
        const user = await db.table(tableName).where('id', '=', testId).first()
        expect(user).toBeDefined()
        expect(user?.id).toBe(testId)

        // 3. Update
        await db.table(tableName).where('id', '=', testId).update({
          name: `Updated ${name} User`
        })
        
        const updatedUser = await db.table(tableName).where('id', '=', testId).first()
        expect(updatedUser?.name).toBe(`Updated ${name} User`)

        // 4. Delete
        await db.table(tableName).where('id', '=', testId).delete()
        const deletedUser = await db.table(tableName).where('id', '=', testId).first()
        expect(deletedUser).toBeNull()
      })
    })
  }

  it('應該支援在運行時替換適配器', async () => {
    // 模擬業務函數，它只依賴介面
    async function getUserCount(database: IDatabaseAccess): Promise<number> {
      return database.table('users').count()
    }

    const atlasDb = createAtlasDatabaseAccess()
    const drizzleDb = createDrizzleDatabaseAccess()

    // 業務代碼不需要知道底層是哪個 ORM
    const count1 = await getUserCount(atlasDb)
    const count2 = await getUserCount(drizzleDb)

    expect(typeof count1).toBe('number')
    expect(typeof count2).toBe('number')
  })
})
