/**
 * IQueryBuilder Immutable 模式單元測試
 *
 * 驗證查詢建構器遵循 Immutable 設計模式：
 * - 所有返回 IQueryBuilder 的方法都返回新實例
 * - 鏈式調用時無副作用
 */

import { describe, it, expect } from 'bun:test'
import { MemoryDatabaseAccess } from '@/Foundation/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'

describe('IQueryBuilder Immutable Pattern', () => {
	describe('MemoryQueryBuilder Immutable 行為', () => {
		it('where() 應該返回新實例，不修改原實例', async () => {
			const db = new MemoryDatabaseAccess()
			const qb1 = db.table('users')
			const qb2 = qb1.where('id', '=', '1')

			// 驗證 qb1 和 qb2 是不同的實例
			expect(qb1).not.toBe(qb2)

			// 驗證 qb1 沒有被修改（沒有 WHERE 條件）
			const result1 = await qb1.select()
			expect(result1.length).toBe(0)

			// 驗證 qb2 有 WHERE 條件（但由於沒有數據，結果也是空）
			const result2 = await qb2.select()
			expect(result2.length).toBe(0)
		})

		it('limit() 應該返回新實例', () => {
			const db = new MemoryDatabaseAccess()
			const qb1 = db.table('users')
			const qb2 = qb1.limit(10)

			expect(qb1).not.toBe(qb2)
		})

		it('offset() 應該返回新實例', () => {
			const db = new MemoryDatabaseAccess()
			const qb1 = db.table('users')
			const qb2 = qb1.offset(5)

			expect(qb1).not.toBe(qb2)
		})

		it('orderBy() 應該返回新實例', () => {
			const db = new MemoryDatabaseAccess()
			const qb1 = db.table('users')
			const qb2 = qb1.orderBy('name', 'ASC')

			expect(qb1).not.toBe(qb2)
		})

		it('鏈式調用應該創建多個新實例', () => {
			const db = new MemoryDatabaseAccess()
			const qb1 = db.table('users')
			const qb2 = qb1.where('status', '=', 'active')
			const qb3 = qb2.limit(10)
			const qb4 = qb3.orderBy('created_at', 'DESC')

			// 所有實例都應該是不同的
			expect(qb1).not.toBe(qb2)
			expect(qb2).not.toBe(qb3)
			expect(qb3).not.toBe(qb4)
			expect(qb1).not.toBe(qb4)
		})

		it('whereNull() 應該返回新實例', () => {
			const db = new MemoryDatabaseAccess()
			const qb1 = db.table('users')
			const qb2 = qb1.whereNull('deleted_at')

			expect(qb1).not.toBe(qb2)
		})

		it('whereNotNull() 應該返回新實例', () => {
			const db = new MemoryDatabaseAccess()
			const qb1 = db.table('users')
			const qb2 = qb1.whereNotNull('verified_at')

			expect(qb1).not.toBe(qb2)
		})

		it('whereIn() 應該返回新實例', () => {
			const db = new MemoryDatabaseAccess()
			const qb1 = db.table('users')
			const qb2 = qb1.whereIn('status', ['active', 'pending'])

			expect(qb1).not.toBe(qb2)
		})

		it('whereBetween() 應該返回新實例', () => {
			const db = new MemoryDatabaseAccess()
			const qb1 = db.table('users')
			const start = new Date('2026-01-01')
			const end = new Date('2026-12-31')
			const qb2 = qb1.whereBetween('created_at', [start, end])

			expect(qb1).not.toBe(qb2)
		})

		it('join() 應該返回新實例', () => {
			const db = new MemoryDatabaseAccess()
			const qb1 = db.table('orders')
			const qb2 = qb1.join('users', 'user_id', 'id')

			expect(qb1).not.toBe(qb2)
		})

		it('leftJoin() 應該返回新實例', () => {
			const db = new MemoryDatabaseAccess()
			const qb1 = db.table('orders')
			const qb2 = qb1.leftJoin('users', 'user_id', 'id')

			expect(qb1).not.toBe(qb2)
		})

		it('groupBy() 應該返回新實例', () => {
			const db = new MemoryDatabaseAccess()
			const qb1 = db.table('orders')
			const qb2 = qb1.groupBy('user_id', 'status')

			expect(qb1).not.toBe(qb2)
		})

		it('having() 應該返回新實例', () => {
			const db = new MemoryDatabaseAccess()
			const qb1 = db.table('orders')
			const qb2 = qb1.having('count', '>', 5)

			expect(qb1).not.toBe(qb2)
		})

		it('orWhere() 應該返回新實例', () => {
			const db = new MemoryDatabaseAccess()
			const qb1 = db.table('users')
			const qb2 = qb1.orWhere('role', '=', 'admin')

			expect(qb1).not.toBe(qb2)
		})
	})

	describe('Immutable 無副作用驗證', () => {
		it('分支查詢應該獨立執行', async () => {
			const db = new MemoryDatabaseAccess()

			// 準備數據
			await db.table('products').insert({ id: '1', name: 'Product A', price: 100, category: 'A' })
			await db.table('products').insert({ id: '2', name: 'Product B', price: 200, category: 'B' })
			await db.table('products').insert({ id: '3', name: 'Product C', price: 150, category: 'A' })

			// 建立基礎查詢
			const baseQb = db.table('products')

			// 分支 1：查詢 category A 的商品
			const qb1 = baseQb.where('category', '=', 'A')
			const result1 = await qb1.select()

			// 分支 2：查詢 price > 150 的商品
			const qb2 = baseQb.where('price', '>', 150)
			const result2 = await qb2.select()

			// 驗證結果獨立
			expect(result1.length).toBe(2) // Product A, Product C
			expect(result2.length).toBe(1) // Product B

			// 驗證基礎查詢沒有被修改（返回所有商品）
			const allProducts = await baseQb.select()
			expect(allProducts.length).toBe(3)
		})

		it('複雜鏈式調用應該產生正確的結果', async () => {
			const db = new MemoryDatabaseAccess()

			// 準備數據
			for (let i = 1; i <= 20; i++) {
				await db
					.table('items')
					.insert({ id: String(i), status: i % 2 === 0 ? 'active' : 'inactive', value: i * 10 })
			}

			// 建立基礎查詢
			const baseQb = db.table('items')

			// 分支 1：active items，limit 5
			const qb1 = baseQb.where('status', '=', 'active').limit(5)
			const result1 = await qb1.select()
			expect(result1.length).toBeLessThanOrEqual(5)
			expect(result1.every((r) => r.status === 'active')).toBe(true)

			// 分支 2：value > 100，offset 5
			const qb2 = baseQb.where('value', '>', 100).offset(5)
			const result2 = await qb2.select()
			expect(result2.every((r) => (r.value as number) > 100)).toBe(true)

			// 驗證基礎查詢沒有被修改
			const allItems = await baseQb.select()
			expect(allItems.length).toBe(20)
		})
	})

	describe('Immutable 模式與查詢功能相容性', () => {
		it('Immutable 模式不應該影響查詢準確性', async () => {
			const db = new MemoryDatabaseAccess()

			// 準備數據
			await db.table('users').insert({ id: '1', name: 'Alice', age: 25, role: 'admin' })
			await db.table('users').insert({ id: '2', name: 'Bob', age: 30, role: 'user' })
			await db.table('users').insert({ id: '3', name: 'Charlie', age: 35, role: 'admin' })

			// 複雜查詢
			const result = await db
				.table('users')
				.where('role', '=', 'admin')
				.orderBy('age', 'DESC')
				.limit(10)
				.select()

			expect(result.length).toBe(2)
			expect(result[0].name).toBe('Charlie')
			expect(result[1].name).toBe('Alice')
		})

		it('多欄位排序在 Immutable 模式下應該正確運作', async () => {
			const db = new MemoryDatabaseAccess()

			// 準備數據
			await db
				.table('records')
				.insert({ user_id: '1', status: 'active', created_at: new Date('2026-01-01') })
			await db
				.table('records')
				.insert({ user_id: '1', status: 'inactive', created_at: new Date('2026-01-02') })
			await db
				.table('records')
				.insert({ user_id: '2', status: 'active', created_at: new Date('2026-01-01') })

			// 多欄位排序
			const result = await db
				.table('records')
				.orderBy('user_id', 'ASC')
				.orderBy('status', 'DESC')
				.select()

			expect(result[0].user_id).toBe('1')
			expect(result[0].status).toBe('inactive')
		})
	})
})
