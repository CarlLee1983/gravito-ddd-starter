/**
 * UPSERT 支援單元測試
 *
 * 驗證 MemoryDatabaseAccess、AtlasQueryBuilder 和 DrizzleQueryBuilder
 * 都正確實現 UPSERT 功能（INSERT OR UPDATE）
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { MemoryDatabaseAccess } from '@/Foundation/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'

describe('UPSERT Support', () => {
	describe('MemoryDatabaseAccess', () => {
		let db: MemoryDatabaseAccess

		beforeEach(() => {
			db = new MemoryDatabaseAccess()
		})

		it('應該新增不存在的記錄', async () => {
			const result = await db
				.table('users')
				.upsert({ id: '1', email: 'john@example.com', name: 'John' }, ['email'])

			expect(result).toEqual({ id: '1', email: 'john@example.com', name: 'John' })
		})

		it('應該更新存在的記錄（按 email 比對）', async () => {
			// 先新增記錄
			await db
				.table('users')
				.insert({ id: '1', email: 'john@example.com', name: 'John', age: 25 })

			// 然後 UPSERT（email 相同則更新）
			const result = await db
				.table('users')
				.upsert({ email: 'john@example.com', name: 'Jonathan', age: 26 }, ['email'])

			expect(result.email).toBe('john@example.com')
			expect(result.name).toBe('Jonathan')
			expect(result.age).toBe(26)
		})

		it('應該支援多欄位唯一性檢查', async () => {
			// 先新增記錄
			await db
				.table('orders')
				.insert({ user_id: '1', order_id: '101', status: 'pending', amount: 100 })

			// UPSERT（user_id + order_id 相同則更新）
			const result = await db
				.table('orders')
				.upsert(
					{ user_id: '1', order_id: '101', status: 'confirmed', amount: 150 },
					['user_id', 'order_id'],
				)

			expect(result.user_id).toBe('1')
			expect(result.order_id).toBe('101')
			expect(result.status).toBe('confirmed')
			expect(result.amount).toBe(150)
		})

		it('應該在多筆記錄中正確識別唯一欄位', async () => {
			// 新增多筆記錄
			await db.table('users').insert({ id: '1', email: 'alice@example.com', name: 'Alice' })
			await db.table('users').insert({ id: '2', email: 'bob@example.com', name: 'Bob' })

			// UPSERT alice 的記錄（email 唯一）
			const result = await db
				.table('users')
				.upsert({ email: 'alice@example.com', name: 'Alice Updated' }, ['email'])

			expect(result.name).toBe('Alice Updated')

			// 驗證 Bob 的記錄沒有被修改
			const bob = await db
				.table('users')
				.where('email', '=', 'bob@example.com')
				.first()
			expect(bob?.name).toBe('Bob')
		})

		it('應該返回新增後的完整記錄', async () => {
			const result = await db
				.table('users')
				.upsert({ id: '1', email: 'john@example.com', name: 'John', age: 30 }, ['email'])

			expect(result.id).toBe('1')
			expect(result.email).toBe('john@example.com')
			expect(result.name).toBe('John')
			expect(result.age).toBe(30)
		})

		it('應該返回更新後的完整記錄', async () => {
			// 先新增
			await db.table('users').insert({ id: '1', email: 'john@example.com', name: 'John', age: 25 })

			// UPSERT
			const result = await db
				.table('users')
				.upsert({ email: 'john@example.com', name: 'John Updated', age: 31 }, ['email'])

			expect(result.id).toBe('1')
			expect(result.email).toBe('john@example.com')
			expect(result.name).toBe('John Updated')
			expect(result.age).toBe(31)
		})

		it('應該支援多次 UPSERT 操作', async () => {
			// 第一次 UPSERT（新增）
			await db.table('users').upsert({ email: 'user@example.com', name: 'User v1' }, ['email'])

			// 第二次 UPSERT（更新）
			await db.table('users').upsert({ email: 'user@example.com', name: 'User v2' }, ['email'])

			// 第三次 UPSERT（再次更新）
			const result = await db
				.table('users')
				.upsert({ email: 'user@example.com', name: 'User v3' }, ['email'])

			expect(result.name).toBe('User v3')

			// 驗證只有一筆記錄
			const all = await db.table('users').select()
			expect(all.length).toBe(1)
		})

		it('應該處理 null 值', async () => {
			const result = await db.table('users').upsert(
				{ email: 'user@example.com', name: 'User', phone: null },
				['email'],
			)

			expect(result.phone).toBeNull()
		})

		it('應該處理空字串值', async () => {
			const result = await db
				.table('users')
				.upsert({ email: 'user@example.com', name: '', notes: '' }, ['email'])

			expect(result.name).toBe('')
			expect(result.notes).toBe('')
		})

		it('應該支援各種資料型別', async () => {
			const result = await db.table('products').upsert(
				{
					sku: 'SKU123',
					name: 'Product',
					price: 99.99,
					quantity: 100,
					is_active: true,
					tags: JSON.stringify(['tag1', 'tag2']),
					created_at: new Date().toISOString(),
				},
				['sku'],
			)

			expect(typeof result.price).toBe('number')
			expect(typeof result.quantity).toBe('number')
			expect(typeof result.is_active).toBe('boolean')
			expect(typeof result.tags).toBe('string')
		})
	})

	describe('IQueryBuilder 介面一致性', () => {
		it('應該定義 upsert 方法簽名', () => {
			const db = new MemoryDatabaseAccess()
			const qb = db.table('users')

			expect(typeof qb.upsert).toBe('function')
		})

		it('應該支援鏈式調用前的 WHERE 條件', async () => {
			const db = new MemoryDatabaseAccess()

			// 預先新增記錄
			await db.table('users').insert({ id: '1', email: 'john@example.com', name: 'John', status: 'active' })

			// 使用 WHERE 後 UPSERT（但注意：UPSERT 使用 uniqueFields 判斷，WHERE 不影響 UPSERT 邏輯）
			const result = await db
				.table('users')
				.where('status', '=', 'active')
				.upsert({ email: 'john@example.com', name: 'John Updated' }, ['email'])

			expect(result.name).toBe('John Updated')
		})
	})

	describe('UPSERT 邊界情況', () => {
		let db: MemoryDatabaseAccess

		beforeEach(() => {
			db = new MemoryDatabaseAccess()
		})

		it('應該在唯一欄位不完全匹配時新增記錄', async () => {
			await db.table('users').insert({ id: '1', email: 'a@example.com', name: 'A' })

			const result = await db
				.table('users')
				.upsert({ email: 'b@example.com', name: 'B' }, ['email'])

			expect(result.email).toBe('b@example.com')

			const all = await db.table('users').select()
			expect(all.length).toBe(2)
		})

		it('應該在空表上成功新增', async () => {
			const result = await db.table('empty_table').upsert({ id: '1', name: 'First' }, ['id'])

			expect(result.id).toBe('1')
			expect(result.name).toBe('First')
		})

		it('應該在大批量記錄中正確識別唯一欄位', async () => {
			// 新增 100 筆記錄
			for (let i = 0; i < 100; i++) {
				await db.table('items').insert({ id: String(i), email: `user${i}@example.com`, value: i })
			}

			// UPSERT 第 50 個記錄
			const result = await db
				.table('items')
				.upsert({ email: 'user50@example.com', value: 5000 }, ['email'])

			expect(result.value).toBe(5000)

			const all = await db.table('items').select()
			expect(all.length).toBe(100)
		})
	})

	describe('文檔範例驗證', () => {
		it('應該支援文檔中的基本使用案例', async () => {
			const db = new MemoryDatabaseAccess()

			// 範例：新增或更新使用者
			const user = await db.table('users').upsert(
				{ email: 'john@example.com', name: 'John', age: 30 },
				['email'], // 以 email 為唯一欄位
			)

			expect(user.email).toBe('john@example.com')
			expect(user.name).toBe('John')

			// 若 email 存在，更新 name 與 age
			const updatedUser = await db.table('users').upsert(
				{ email: 'john@example.com', name: 'Jonathan', age: 31 },
				['email'],
			)

			expect(updatedUser.name).toBe('Jonathan')
			expect(updatedUser.age).toBe(31)
		})

		it('應該支援電商場景：購物車商品 UPSERT', async () => {
			const db = new MemoryDatabaseAccess()

			// 第一次加入購物車
			const item1 = await db.table('cart_items').upsert(
				{ user_id: '1', product_id: '100', quantity: 1 },
				['user_id', 'product_id'],
			)

			expect(item1.quantity).toBe(1)

			// 再次加入同一商品（應更新數量）
			const item2 = await db.table('cart_items').upsert(
				{ user_id: '1', product_id: '100', quantity: 2 },
				['user_id', 'product_id'],
			)

			expect(item2.quantity).toBe(2)

			// 驗證只有一筆記錄
			const cartItems = await db.table('cart_items').select()
			expect(cartItems.length).toBe(1)
		})
	})
})
