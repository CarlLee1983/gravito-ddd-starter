/**
 * Drizzle 基礎功能測試
 *
 * 簡單驗證 Drizzle 適配器的基本功能
 * 不依賴 Atlas，可獨立運行
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createDrizzleDatabaseAccess } from '@/adapters/Drizzle'
import { createDrizzleConnectivityCheck } from '@/adapters/Drizzle'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

describe('Drizzle 適配器 - 基礎功能驗證', () => {
  let db: IDatabaseAccess

  describe('初始化', () => {
    it('應該能創建 DatabaseAccess 實例', () => {
      db = createDrizzleDatabaseAccess()
      expect(db).toBeDefined()
      expect(typeof db.table).toBe('function')
    })

    it('應該能創建 ConnectivityCheck 實例', () => {
      const check = createDrizzleConnectivityCheck()
      expect(check).toBeDefined()
      expect(typeof check.ping).toBe('function')
    })
  })

  describe('QueryBuilder 介面', () => {
    beforeEach(() => {
      db = createDrizzleDatabaseAccess()
    })

    it('table() 應返回 QueryBuilder', () => {
      const query = db.table('users')
      expect(query).toBeDefined()
    })

    it('QueryBuilder 應有所有必要方法', () => {
      const query = db.table('users')

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

    it('應支持鏈式調用', () => {
      const query = db.table('users')
        .where('email', '=', 'test@example.com')
        .limit(10)
        .offset(0)
        .orderBy('created_at', 'DESC')

      expect(query).toBeDefined()
    })

    it('select() 應返回 Promise<Record[]>', async () => {
      const result = await db.table('users').select()
      expect(Array.isArray(result)).toBe(true)
    })

    it('first() 應返回 Promise<Record | null>', async () => {
      const result = await db.table('users').where('id', '=', 'nonexistent').first()
      expect(result === null || typeof result === 'object').toBe(true)
    })

    it('count() 應返回 Promise<number>', async () => {
      const count = await db.table('users').count()
      expect(typeof count).toBe('number')
      expect(count >= 0).toBe(true)
    })
  })

  describe('WHERE 運算子支持', () => {
    beforeEach(() => {
      db = createDrizzleDatabaseAccess()
    })

    it('應支持 = 運算子', () => {
      const query = db.table('users').where('id', '=', '123')
      expect(query).toBeDefined()
    })

    it('應支持 != 運算子', () => {
      const query = db.table('users').where('email', '!=', 'test@example.com')
      expect(query).toBeDefined()
    })

    it('應支持 > 運算子', () => {
      const query = db.table('users').where('name', '>', 'A')
      expect(query).toBeDefined()
    })

    it('應支持 < 運算子', () => {
      const query = db.table('users').where('name', '<', 'Z')
      expect(query).toBeDefined()
    })

    it('應支持 >= 運算子', () => {
      const query = db.table('users').where('email', '>=', 'a@example.com')
      expect(query).toBeDefined()
    })

    it('應支持 <= 運算子', () => {
      const query = db.table('users').where('email', '<=', 'z@example.com')
      expect(query).toBeDefined()
    })

    it('應支持 like 運算子', () => {
      const query = db.table('users').where('email', 'like', '%@example.com')
      expect(query).toBeDefined()
    })

    it('應支持 in 運算子', () => {
      const query = db.table('users').where('name', 'in', ['admin', 'user'])
      expect(query).toBeDefined()
    })
  })

  describe('分頁和排序', () => {
    beforeEach(() => {
      db = createDrizzleDatabaseAccess()
    })

    it('應支持 limit()', () => {
      const query = db.table('users').limit(10)
      expect(query).toBeDefined()
    })

    it('應支持 offset()', () => {
      const query = db.table('users').offset(20)
      expect(query).toBeDefined()
    })

    it('應支持 orderBy() 使用 ASC', () => {
      const query = db.table('users').orderBy('created_at', 'ASC')
      expect(query).toBeDefined()
    })

    it('應支持 orderBy() 使用 DESC', () => {
      const query = db.table('users').orderBy('created_at', 'DESC')
      expect(query).toBeDefined()
    })

    it('應支持 whereBetween()', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')
      const query = db.table('users').whereBetween('created_at', [startDate, endDate])
      expect(query).toBeDefined()
    })
  })

  describe('連線檢查', () => {
    it('ping() 應返回 boolean', async () => {
      const check = createDrizzleConnectivityCheck()
      const result = await check.ping()
      expect(typeof result).toBe('boolean')
    })

    it('ping() 應返回 false 或 true', async () => {
      const check = createDrizzleConnectivityCheck()
      const result = await check.ping()
      expect([true, false]).toContain(result)
    })
  })
})
