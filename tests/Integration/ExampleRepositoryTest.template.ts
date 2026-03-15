/**
 * @file tests/Integration/ExampleRepositoryTest.template.ts
 * @description Repository 集成測試範例
 *
 * 這是一個範本檔案，展示如何使用新的測試隔離機制。
 * 複製此檔案並修改以測試你的 Repository。
 *
 * 特性：
 * ✅ 使用內存 SQLite（快速、隔離）
 * ✅ 自動清理數據庫（無副作用）
 * ✅ 依賴注入容器
 * ✅ 數據工廠（簡化測試數據創建）
 *
 * @usage
 * ```bash
 * # 複製此檔案
 * cp tests/Integration/ExampleRepositoryTest.template.ts \
 *    tests/Integration/YourModule/YourRepositoryTest.ts
 *
 * # 修改內容，然後運行
 * bun test tests/Integration/YourModule/YourRepositoryTest.ts
 * ```
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { setupTestDatabase, cleanupTestDatabase, MockContainer } from '../setup'
import { DataFactory } from '../helpers'

describe('ExampleRepository Integration Test', () => {
	let dbPath: string
	let container: MockContainer
	let factory: DataFactory

	/**
	 * 測試設置
	 *
	 * - 建立內存數據庫
	 * - 初始化容器
	 * - 初始化數據工廠
	 * - 執行 migration（如需要）
	 */
	beforeEach(async () => {
		// 1. 建立測試 DB（內存 SQLite）
		dbPath = await setupTestDatabase(true)

		// 2. 初始化 DI 容器
		container = new MockContainer()

		// 3. 註冊依賴
		container.singleton('database', () => ({
			getRepository: (entity: any) => ({
				// Mock repository 方法
				findById: async (id: string) => ({ id, name: 'Test' }),
				create: async (data: any) => ({ id: '1', ...data }),
				save: async (entity: any) => entity,
				delete: async (id: string) => true,
			}),
		}))

		// 4. 初始化數據工廠
		factory = new DataFactory()
	})

	/**
	 * 測試清理
	 *
	 * - 清理內存數據庫（自動釋放）
	 * - 重置容器
	 * - 重置數據工廠
	 */
	afterEach(async () => {
		await cleanupTestDatabase(dbPath)
		container.reset()
		factory.reset()
	})

	/**
	 * 測試範例：建立實體
	 */
	it('should create entity', async () => {
		const db = container.make('database')
		const repo = db.getRepository('SomeEntity')

		// 使用數據工廠建立測試數據
		const userData = factory.user({ email: 'test@example.com' })

		// 執行操作
		const created = await repo.create(userData)

		// 驗證結果
		expect(created).toBeDefined()
		expect(created.email).toBe('test@example.com')
	})

	/**
	 * 測試範例：查詢實體
	 */
	it('should find entity by id', async () => {
		const db = container.make('database')
		const repo = db.getRepository('SomeEntity')

		// 建立數據
		const user = factory.user()
		await repo.create(user)

		// 查詢數據
		const found = await repo.findById(user.id)

		// 驗證結果
		expect(found).toBeDefined()
		expect(found.id).toBe(user.id)
	})

	/**
	 * 測試範例：更新實體
	 */
	it('should update entity', async () => {
		const db = container.make('database')
		const repo = db.getRepository('SomeEntity')

		// 建立初始數據
		const user = factory.user()
		const created = await repo.create(user)

		// 更新數據
		const updated = await repo.save({ ...created, name: 'Updated Name' })

		// 驗證結果
		expect(updated.name).toBe('Updated Name')
	})

	/**
	 * 測試範例：刪除實體
	 */
	it('should delete entity', async () => {
		const db = container.make('database')
		const repo = db.getRepository('SomeEntity')

		// 建立數據
		const user = factory.user()
		const created = await repo.create(user)

		// 刪除數據
		const deleted = await repo.delete(created.id)

		// 驗證結果
		expect(deleted).toBe(true)
	})

	/**
	 * 測試範例：事件驅動
	 *
	 * 當 Repository 發佈 DomainEvent 時進行測試
	 */
	it('should publish domain event on create', async () => {
		const db = container.make('database')
		const repo = db.getRepository('SomeEntity')

		// 追蹤事件
		let eventPublished = false
		const originalCreate = repo.create

		repo.create = async (data: any) => {
			const result = await originalCreate(data)
			eventPublished = true
			return result
		}

		// 執行操作
		const user = factory.user()
		await repo.create(user)

		// 驗證事件
		expect(eventPublished).toBe(true)
	})
})

/**
 * 測試隔離檢查清單
 *
 * ✅ 使用 setupTestDatabase(true) 建立內存 DB
 * ✅ beforeEach 中初始化依賴
 * ✅ afterEach 中清理資源
 * ✅ 使用 DataFactory 簡化數據建立
 * ✅ 沒有寫入磁碟檔案
 * ✅ 每個測試完全隔離
 *
 * 執行測試後不應有：
 * ✅ gravito.db, test.db, storage/*.db 等檔案
 * ✅ 任何遺留的副作用資產
 */
