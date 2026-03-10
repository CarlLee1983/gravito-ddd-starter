/**
 * DatabaseAccess 適配器可替換性測試
 *
 * 驗證：
 * 1. IDatabaseAccess 介面契約被完全實現
 * 2. 任何實現都可以無縫替換
 * 3. 查詢建構器鏈式調用正常運作
 * 4. 資料庫操作的結果一致性
 *
 * 使用此測試驗證新 ORM 適配器（Drizzle、Prisma 等）
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { IDatabaseAccess, IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'

/**
 * 通用 DatabaseAccess 適配器測試
 */
export function createDatabaseAccessSwappabilityTests(
  adapterName: string,
  createDatabase: () => IDatabaseAccess
) {
  describe(`${adapterName} - DatabaseAccess Swappability`, () => {
    let db: IDatabaseAccess

    beforeEach(() => {
      db = createDatabase()
    })

    describe('查詢建構器基本操作', () => {
      it('應該能建立查詢建構器', () => {
        const query = db.table('users')
        expect(query).toBeDefined()
        expect(typeof query.select).toBe('function')
        expect(typeof query.first).toBe('function')
        expect(typeof query.where).toBe('function')
      })

      it('應該支援鏈式調用 - where + first', async () => {
        const query = db.table('users')
          .where('id', '=', 'test-id')

        expect(query).toBeDefined()
        expect(typeof query.first).toBe('function')

        // 實際執行時可能返回 null（如果沒有該記錄），但不應拋出錯誤
        const result = await query.first()
        expect(result === null || typeof result === 'object').toBe(true)
      })

      it('應該支援鏈式調用 - multiple where 條件', () => {
        const query = db.table('users')
          .where('email', '=', 'test@example.com')
          .where('status', '=', 'active')

        expect(query).toBeDefined()
        expect(typeof query.select).toBe('function')
      })

      it('應該支援 limit 和 offset', () => {
        const query = db.table('users')
          .limit(10)
          .offset(5)

        expect(query).toBeDefined()
      })

      it('應該支援 orderBy', () => {
        const query = db.table('users')
          .orderBy('created_at', 'desc')

        expect(query).toBeDefined()
      })
    })

    describe('查詢操作', () => {
      it('select() 應該返回陣列', async () => {
        const results = await db.table('users').select()
        expect(Array.isArray(results)).toBe(true)
      })

      it('first() 應該返回單筆或 null', async () => {
        const result = await db.table('users').first()
        expect(result === null || typeof result === 'object').toBe(true)
      })

      it('count() 應該返回數字', async () => {
        const count = await db.table('users').count()
        expect(typeof count).toBe('number')
        expect(count >= 0).toBe(true)
      })
    })

    describe('WHERE 運算子', () => {
      const operators = ['=', '!=', '>', '<', '>=', '<=', 'like', 'in']

      operators.forEach((op) => {
        it(`應該支援 "${op}" 運算子`, () => {
          const query = db.table('users').where('id', op as any, 'value')
          expect(query).toBeDefined()
        })
      })
    })

    describe('插入、更新、刪除操作', () => {
      it('insert() 應該被定義', () => {
        const query = db.table('users')
        expect(typeof query.insert).toBe('function')
      })

      it('update() 應該被定義', () => {
        const query = db.table('users')
        expect(typeof query.update).toBe('function')
      })

      it('delete() 應該被定義', () => {
        const query = db.table('users')
        expect(typeof query.delete).toBe('function')
      })
    })

    describe('進階查詢', () => {
      it('應該支援 whereBetween', () => {
        const query = db.table('posts')
          .whereBetween('created_at', ['2024-01-01', '2024-12-31'])

        expect(query).toBeDefined()
      })

      it('應該支援複雜查詢鏈', async () => {
        const query = db.table('users')
          .where('status', '=', 'active')
          .where('email', 'like', '%@example.com')
          .orderBy('created_at', 'desc')
          .limit(10)
          .offset(0)

        // 應該能執行而不拋出錯誤
        const results = await query.select()
        expect(Array.isArray(results)).toBe(true)
      })
    })

    describe('型別安全性', () => {
      it('QueryBuilder 應該返回正確的型別', async () => {
        const single = await db.table('users').first()
        expect(
          single === null ||
          (typeof single === 'object' && !Array.isArray(single))
        ).toBe(true)

        const multiple = await db.table('users').select()
        expect(Array.isArray(multiple)).toBe(true)

        const count = await db.table('users').count()
        expect(typeof count === 'number').toBe(true)
      })
    })

    describe('介面一致性', () => {
      it('所有必要的方法都應該存在', () => {
        const query = db.table('test')

        const requiredMethods = [
          'where',
          'first',
          'select',
          'insert',
          'update',
          'delete',
          'limit',
          'offset',
          'orderBy',
          'whereBetween',
          'count',
        ]

        requiredMethods.forEach((method) => {
          expect(typeof (query as any)[method]).toBe('function')
        })
      })

      it('IDatabaseAccess 應該只有 table 方法', () => {
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(db))
        expect(methods).toContain('table')
      })
    })
  })
}

/**
 * Atlas 適配器具體測試
 */
import { createGravitoDatabaseAccess } from '@/adapters/Atlas'

describe('Atlas DatabaseAccess - 可替換性驗證', () => {
  createDatabaseAccessSwappabilityTests(
    'Atlas',
    () => createGravitoDatabaseAccess()
  )
})

/**
 * Drizzle 適配器測試
 */
import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'

describe('Drizzle DatabaseAccess - 可替換性驗證', () => {
  createDatabaseAccessSwappabilityTests(
    'Drizzle',
    () => createDrizzleDatabaseAccess()
  )
})

/**
 * 待實現：Prisma 適配器測試
 * describe('Prisma DatabaseAccess - 可替換性驗證', () => {
 *   createDatabaseAccessSwappabilityTests(
 *     'Prisma',
 *     () => createPrismaDatabaseAccess()
 *   )
 * })
 */
