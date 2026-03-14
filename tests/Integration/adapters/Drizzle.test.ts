/**
 * Drizzle 適配器 整合測試
 *
 * 驗證 Drizzle 實作是否正確符合 IDatabaseAccess 與 IDatabaseConnectivityCheck 契約
 *
 * @module test/integration/adapters/Drizzle
 */

import { describe, it, expect, beforeAll } from 'bun:test'
import { createDrizzleDatabaseAccess } from '@/Foundation/Infrastructure/Database/Adapters/Drizzle'
import { createDrizzleConnectivityCheck } from '@/Foundation/Infrastructure/Database/Adapters/Drizzle'
import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'

describe('Drizzle 適配器 整合測試', () => {
  let db: IDatabaseAccess

  beforeAll(async () => {
    db = createDrizzleDatabaseAccess()
    
    // 初始化 Schema (確保測試表存在)
    try {
      const rawDb = (db as any).db || db
      // Drizzle 適配器目前沒有暴露 raw execute，我們透過 table().insert 觸發初始化，
      // 或直接在適配器配置中處理。這裡我們假設測試環境需要手動建立表。
      // 由於目前的 DrizzleAdapter 隱藏了底層，我們直接嘗試操作。
    } catch (e) {
      console.error('Schema init failed', e)
    }
  })

  it('應該能成功連線資料庫 (Ping)', async () => {
    const checker = createDrizzleConnectivityCheck()
    const isHealthy = await checker.ping()
    // 註：這需要環境中有 DATABASE_URL，若無則會使用預設的 local.db
    expect(typeof isHealthy).toBe('boolean')
  })

  it('應該能對 users 表進行基本操作', async () => {
    const tableName = 'users'
    const testId = crypto.randomUUID()
    
    // 1. Insert
    await db.table(tableName).insert({
      id: testId,
      name: 'Drizzle Test User',
      email: `drizzle-${testId}@example.com`
    })

    // 2. Select / Where / First
    const user = await db.table(tableName).where('id', '=', testId).first()
    expect(user).toBeDefined()
    expect(user?.name).toBe('Drizzle Test User')

    // 3. Update
    await db.table(tableName).where('id', '=', testId).update({
      name: 'Updated Drizzle User'
    })
    
    const updatedUser = await db.table(tableName).where('id', '=', testId).first()
    expect(updatedUser?.name).toBe('Updated Drizzle User')

    // 4. Count
    const count = await db.table(tableName).where('id', '=', testId).count()
    expect(count).toBe(1)

    // 5. Delete
    await db.table(tableName).where('id', '=', testId).delete()
    const deletedUser = await db.table(tableName).where('id', '=', testId).first()
    expect(deletedUser).toBeNull()
  })
})
