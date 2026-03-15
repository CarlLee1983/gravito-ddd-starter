/**
 * @file QueryBuilderExtensions.test.ts
 * @description 測試 IQueryBuilder 擴展方法（whereIn、orWhere、join、leftJoin、groupBy）
 */

import { describe, expect, it } from 'bun:test'
import { MemoryDatabaseAccess } from '@/Foundation/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'

describe('QueryBuilder Extensions', () => {
	describe('whereIn()', () => {
		it('應該找到符合 IN 條件的記錄', async () => {
			const db = new MemoryDatabaseAccess()

			await db.table('products').insert({ id: 1, name: 'Product A', category: 'electronics' })
			await db.table('products').insert({ id: 2, name: 'Product B', category: 'books' })
			await db.table('products').insert({ id: 3, name: 'Product C', category: 'electronics' })

			const results = await db
				.table('products')
				.whereIn('id', [1, 3])
				.select()

			expect(results).toHaveLength(2)
			expect(results.map((r) => r.id)).toEqual(expect.arrayContaining([1, 3]))
		})

		it('應該支援鏈式調用 whereIn().where()', async () => {
			const db = new MemoryDatabaseAccess()

			await db.table('products').insert({ id: 1, name: 'Product A', category: 'electronics', price: 100 })
			await db.table('products').insert({ id: 2, name: 'Product B', category: 'books', price: 50 })
			await db.table('products').insert({ id: 3, name: 'Product C', category: 'electronics', price: 150 })

			const results = await db
				.table('products')
				.whereIn('id', [1, 3])
				.where('price', '>', 120)
				.select()

			expect(results).toHaveLength(1)
			expect(results[0].id).toBe(3)
		})
	})

	describe('orWhere()', () => {
		it('應該找到符合 OR 條件的記錄', async () => {
			const db = new MemoryDatabaseAccess()

			await db.table('users').insert({ id: 1, name: 'Alice', status: 'active' })
			await db.table('users').insert({ id: 2, name: 'Bob', status: 'inactive' })
			await db.table('users').insert({ id: 3, name: 'Charlie', status: 'active' })

			const results = await db
				.table('users')
				.where('status', '=', 'inactive')
				.orWhere('name', '=', 'Charlie')
				.select()

			expect(results).toHaveLength(2)
			expect(results.map((r) => r.id)).toEqual(expect.arrayContaining([2, 3]))
		})

		it('應該支援多個 OR 條件', async () => {
			const db = new MemoryDatabaseAccess()

			await db.table('users').insert({ id: 1, name: 'Alice', role: 'admin' })
			await db.table('users').insert({ id: 2, name: 'Bob', role: 'user' })
			await db.table('users').insert({ id: 3, name: 'Charlie', role: 'moderator' })

			const results = await db
				.table('users')
				.where('role', '=', 'admin')
				.orWhere('role', '=', 'moderator')
				.select()

			expect(results).toHaveLength(2)
			expect(results.map((r) => r.id)).toEqual(expect.arrayContaining([1, 3]))
		})
	})

	describe('groupBy()', () => {
		it('應該根據指定欄位分組', async () => {
			const db = new MemoryDatabaseAccess()

			await db.table('orders').insert({ id: 1, userId: 'user1', amount: 100, status: 'completed' })
			await db.table('orders').insert({ id: 2, userId: 'user1', amount: 50, status: 'pending' })
			await db.table('orders').insert({ id: 3, userId: 'user2', amount: 200, status: 'completed' })
			await db.table('orders').insert({ id: 4, userId: 'user2', amount: 75, status: 'pending' })

			const results = await db
				.table('orders')
				.groupBy('userId')
				.select()

			expect(results).toHaveLength(2)
			expect(results.map((r) => r.userId)).toEqual(expect.arrayContaining(['user1', 'user2']))
		})

		it('應該支援多欄位分組', async () => {
			const db = new MemoryDatabaseAccess()

			await db.table('sales').insert({ date: '2024-01-01', region: 'US', amount: 100 })
			await db.table('sales').insert({ date: '2024-01-01', region: 'US', amount: 50 })
			await db.table('sales').insert({ date: '2024-01-01', region: 'EU', amount: 200 })
			await db.table('sales').insert({ date: '2024-01-02', region: 'US', amount: 75 })

			const results = await db
				.table('sales')
				.groupBy('date', 'region')
				.select()

			expect(results).toHaveLength(3)
		})
	})

	describe('join() 和 leftJoin()', () => {
		it('應該記錄 JOIN 子句（記憶體版本不進行實際 JOIN）', async () => {
			const db = new MemoryDatabaseAccess()

			await db.table('users').insert({ id: 1, name: 'Alice' })
			await db.table('posts').insert({ id: 1, userId: 1, title: 'Post 1' })

			// Memory 版本的 JOIN 只是記錄，不做實際關聯
			const results = await db
				.table('users')
				.join('posts', 'id', 'userId')
				.select()

			// 應該返回原始資料
			expect(results).toHaveLength(1)
			expect(results[0].name).toBe('Alice')
		})

		it('應該支援 leftJoin 子句記錄', async () => {
			const db = new MemoryDatabaseAccess()

			await db.table('users').insert({ id: 1, name: 'Alice' })
			await db.table('posts').insert({ id: 1, userId: 1, title: 'Post 1' })

			const results = await db
				.table('users')
				.leftJoin('posts', 'id', 'userId')
				.select()

			expect(results).toHaveLength(1)
		})
	})

	describe('複合查詢', () => {
		it('應該支援 whereIn + orWhere + groupBy 組合', async () => {
			const db = new MemoryDatabaseAccess()

			await db.table('events').insert({ id: 1, userId: 'user1', type: 'login', status: 'success' })
			await db.table('events').insert({ id: 2, userId: 'user1', type: 'logout', status: 'success' })
			await db.table('events').insert({ id: 3, userId: 'user2', type: 'login', status: 'failed' })
			await db.table('events').insert({ id: 4, userId: 'user2', type: 'login', status: 'success' })

			const results = await db
				.table('events')
				.whereIn('type', ['login', 'logout'])
				.orWhere('status', '=', 'failed')
				.groupBy('userId')
				.select()

			expect(results).toHaveLength(2)
		})

		it('應該支援分頁 + 排序 + whereIn', async () => {
			const db = new MemoryDatabaseAccess()

			for (let i = 1; i <= 5; i++) {
				await db.table('items').insert({ id: i, category: i % 2 === 0 ? 'A' : 'B', value: i * 10 })
			}

			const results = await db
				.table('items')
				.whereIn('id', [1, 2, 3, 4])
				.orderBy('value', 'DESC')
				.limit(2)
				.select()

			expect(results).toHaveLength(2)
			expect(results[0].id).toBe(4) // value = 40
			expect(results[1].id).toBe(3) // value = 30
		})
	})

	describe('計數與聚合', () => {
		it('應該在使用 whereIn 時正確計數', async () => {
			const db = new MemoryDatabaseAccess()

			await db.table('tags').insert({ id: 1, name: 'javascript' })
			await db.table('tags').insert({ id: 2, name: 'typescript' })
			await db.table('tags').insert({ id: 3, name: 'python' })

			const count = await db
				.table('tags')
				.whereIn('id', [1, 2])
				.count()

			expect(count).toBe(2)
		})

		it('應該在使用 orWhere 時正確計數', async () => {
			const db = new MemoryDatabaseAccess()

			await db.table('articles').insert({ id: 1, status: 'draft', author: 'Alice' })
			await db.table('articles').insert({ id: 2, status: 'published', author: 'Bob' })
			await db.table('articles').insert({ id: 3, status: 'draft', author: 'Charlie' })

			const count = await db
				.table('articles')
				.where('status', '=', 'published')
				.orWhere('author', '=', 'Charlie')
				.count()

			expect(count).toBe(2)
		})
	})
})
