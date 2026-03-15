/**
 * @file tests/setup.ts
 * @description 全局測試設置檔案
 *
 * 用途：
 * - 初始化測試環境變量
 * - 建立測試 DB 工廠
 * - 配置全局 beforeEach/afterEach 鉤子
 * - 設置 mock 和 stub
 */

import { beforeAll, afterAll } from 'bun:test'
import * as path from 'path'

/**
 * 測試環境配置
 */
export const TEST_ENV = {
	// 使用內存 SQLite 或臨時檔案路徑
	DATABASE_URL: process.env.TEST_DATABASE_URL || ':memory:',
	NODE_ENV: 'test',
	APP_NAME: 'gravito-ddd-test',
	APP_DEBUG: 'false',
}

/**
 * 初始化測試環境變量
 */
function initializeTestEnvironment() {
	Object.entries(TEST_ENV).forEach(([key, value]) => {
		process.env[key] = String(value)
	})
}

/**
 * 測試資料庫工廠
 *
 * 提供兩種模式：
 * 1. 內存 SQLite（默認）- 快速、隔離、無磁碟 I/O
 * 2. 臨時檔案 - 複現磁碟操作
 */
export class TestDatabaseFactory {
	private static instance: TestDatabaseFactory

	private constructor() {}

	static getInstance(): TestDatabaseFactory {
		if (!TestDatabaseFactory.instance) {
			TestDatabaseFactory.instance = new TestDatabaseFactory()
		}
		return TestDatabaseFactory.instance
	}

	/**
	 * 建立內存數據庫連接
	 * 推薦用於大多數單元和集成測試
	 */
	async createMemoryDatabase() {
		// 這只是佔位符，實際使用時需導入具體 DB 客戶端
		// 例如：better-sqlite3, drizzle-orm, atlas 等
		return {
			type: 'memory' as const,
			path: ':memory:',
			isMemory: true,
		}
	}

	/**
	 * 建立臨時檔案數據庫連接
	 * 用於需要測試磁碟操作的場景
	 */
	async createTemporaryDatabase(prefix = 'test-') {
		// 這只是佔位符
		return {
			type: 'temporary' as const,
			path: path.join('/tmp', `${prefix}${Date.now()}.db`),
			isMemory: false,
		}
	}

	/**
	 * 執行數據庫遷移
	 * 在測試開始前初始化 Schema
	 */
	async runMigrations(dbPath: string) {
		// TODO: 與 @gravito/atlas 或 drizzle-orm 集成
		// 執行遷移腳本
		console.debug(`[Test] Running migrations for: ${dbPath}`)
	}

	/**
	 * 清空數據庫（可選）
	 * 某些測試場景可能需要在測試後保留數據以便偵錯
	 */
	async clearDatabase(dbPath: string) {
		console.debug(`[Test] Clearing database: ${dbPath}`)
		// TODO: 清空所有表數據
	}

	/**
	 * 清理臨時檔案
	 * 內存數據庫無需清理（進程結束自動釋放）
	 */
	async cleanupTemporaryDatabase(dbPath: string) {
		if (dbPath !== ':memory:') {
			try {
				const { unlinkSync } = await import('fs')
				unlinkSync(dbPath)
				console.debug(`[Test] Cleaned up: ${dbPath}`)
			} catch (error) {
				console.warn(`[Test] Failed to clean up ${dbPath}:`, error)
			}
		}
	}
}

/**
 * 全局測試鉤子
 *
 * 用於設置和清理整個測試套件的環境
 */
beforeAll(() => {
	initializeTestEnvironment()
	console.log('[Test] Environment initialized:', TEST_ENV)
})

afterAll(() => {
	console.log('[Test] Test suite completed')
	// 確保沒有遺留的 DB 檔案
	// TODO: 驗證 storage/ 目錄無 .db 檔案
})

/**
 * 全局工具函數
 * 可在測試中直接使用
 */

/**
 * 建立測試 DB 隔離環境
 *
 * @example
 * ```ts
 * import { setupTestDatabase } from 'tests/setup'
 *
 * describe('Order Repository', () => {
 *   let dbPath: string
 *
 *   beforeEach(async () => {
 *     dbPath = await setupTestDatabase()
 *   })
 *
 *   afterEach(async () => {
 *     await cleanupTestDatabase(dbPath)
 *   })
 * })
 * ```
 */
export async function setupTestDatabase(useMemory = true): Promise<string> {
	const factory = TestDatabaseFactory.getInstance()
	const db = useMemory
		? await factory.createMemoryDatabase()
		: await factory.createTemporaryDatabase()

	await factory.runMigrations(db.path)
	return db.path
}

/**
 * 清理測試數據庫
 */
export async function cleanupTestDatabase(dbPath: string): Promise<void> {
	const factory = TestDatabaseFactory.getInstance()
	if (dbPath !== ':memory:') {
		await factory.cleanupTemporaryDatabase(dbPath)
	}
}

/**
 * 模擬 DI 容器
 * 用於提供測試依賴
 */
export class MockContainer {
	private bindings = new Map<string, any>()
	private singletons = new Map<string, any>()

	bind(name: string, factory: () => any): this {
		this.bindings.set(name, factory)
		return this
	}

	singleton(name: string, factory: () => any): this {
		const instance = factory()
		this.singletons.set(name, instance)
		return this
	}

	make(name: string): any {
		if (this.singletons.has(name)) {
			return this.singletons.get(name)
		}

		const factory = this.bindings.get(name)
		if (!factory) {
			throw new Error(`[MockContainer] Binding not found: ${name}`)
		}

		return factory()
	}

	reset(): void {
		this.bindings.clear()
		this.singletons.clear()
	}
}

export default {
	TEST_ENV,
	TestDatabaseFactory,
	setupTestDatabase,
	cleanupTestDatabase,
	MockContainer,
}
