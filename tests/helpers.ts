/**
 * @file tests/helpers.ts
 * @description 測試輔助函數庫
 *
 * 提供常用的測試工具：
 * - Repository 測試工廠
 * - Service 測試工廠
 * - 數據工廠（Factory Pattern）
 * - 斷言助手
 */

import { describe, beforeEach, afterEach } from 'bun:test'
import { setupTestDatabase, cleanupTestDatabase, MockContainer } from './setup'

/**
 * Repository 測試套件工廠
 *
 * @example
 * ```ts
 * createRepositoryTest(
 *   'UserRepository',
 *   async (db, repo) => {
 *     it('should find user by id', async () => {
 *       const user = await repo.findById('123')
 *       expect(user).toBeDefined()
 *     })
 *   }
 * )
 * ```
 */
export function createRepositoryTest(
	name: string,
	testFn: (dbPath: string, container: MockContainer) => void
) {
	describe(name, () => {
		let dbPath: string
		let container: MockContainer

		beforeEach(async () => {
			dbPath = await setupTestDatabase(true) // 使用內存 DB
			container = new MockContainer()
		})

		afterEach(async () => {
			await cleanupTestDatabase(dbPath)
			container.reset()
		})

		testFn(dbPath, container)
	})
}

/**
 * Service 測試套件工廠
 *
 * @example
 * ```ts
 * createServiceTest(
 *   'OrderService',
 *   async (container) => {
 *     it('should create order', async () => {
 *       const service = container.make('orderService')
 *       const order = await service.create({...})
 *       expect(order).toBeDefined()
 *     })
 *   }
 * )
 * ```
 */
export function createServiceTest(
	name: string,
	testFn: (container: MockContainer) => void
) {
	describe(name, () => {
		let container: MockContainer

		beforeEach(() => {
			container = new MockContainer()
		})

		afterEach(() => {
			container.reset()
		})

		testFn(container)
	})
}

/**
 * 數據工廠 - 建立測試數據
 *
 * @example
 * ```ts
 * const factory = new DataFactory()
 * const user = factory.user()
 * const order = factory.order({ userId: user.id })
 * ```
 */
export class DataFactory {
	private counter = 0

	private getId(): string {
		return String(++this.counter)
	}

	/**
	 * 建立測試用戶
	 */
	user(overrides = {}) {
		return {
			id: this.getId(),
			email: `user${this.counter}@test.com`,
			name: `Test User ${this.counter}`,
			role: 'user',
			createdAt: new Date(),
			...overrides,
		}
	}

	/**
	 * 建立測試訂單
	 */
	order(overrides = {}) {
		return {
			id: this.getId(),
			userId: this.getId(),
			total: 100,
			status: 'pending' as const,
			createdAt: new Date(),
			...overrides,
		}
	}

	/**
	 * 建立測試商品
	 */
	product(overrides = {}) {
		return {
			id: this.getId(),
			name: `Product ${this.counter}`,
			price: 29.99,
			stock: 100,
			createdAt: new Date(),
			...overrides,
		}
	}

	/**
	 * 建立測試購物車
	 */
	cart(overrides = {}) {
		return {
			id: this.getId(),
			userId: this.getId(),
			items: [],
			total: 0,
			status: 'active' as const,
			createdAt: new Date(),
			...overrides,
		}
	}

	/**
	 * 建立測試文章
	 */
	post(overrides = {}) {
		return {
			id: this.getId(),
			title: `Test Post ${this.counter}`,
			content: 'Lorem ipsum dolor sit amet',
			authorId: this.getId(),
			status: 'published' as const,
			createdAt: new Date(),
			...overrides,
		}
	}

	reset(): void {
		this.counter = 0
	}
}

/**
 * 斷言助手
 */
export const testAssertions = {
	/**
	 * 驗證 API 回應格式
	 */
	expectApiResponse(response: any, expectedStatus: number) {
		return {
			toBeSuccess() {
				if (response.status !== expectedStatus) {
					throw new Error(
						`Expected status ${expectedStatus}, got ${response.status}`
					)
				}
				if (!response.success) {
					throw new Error(`Expected success: true`)
				}
			},
			toHaveData() {
				if (!response.data) {
					throw new Error(`Expected response.data to be defined`)
				}
				return response.data
			},
			toHaveError(expectedError?: string) {
				if (!response.error) {
					throw new Error(`Expected response.error to be defined`)
				}
				if (expectedError && !response.error.includes(expectedError)) {
					throw new Error(
						`Expected error to include "${expectedError}", got "${response.error}"`
					)
				}
			},
		}
	},

	/**
	 * 驗證時間序列（用於事件順序測試）
	 */
	expectEventSequence(events: any[], expectedSequence: string[]) {
		const actualSequence = events.map((e) => e.type)
		if (JSON.stringify(actualSequence) !== JSON.stringify(expectedSequence)) {
			throw new Error(
				`Expected event sequence [${expectedSequence.join(', ')}], got [${actualSequence.join(', ')}]`
			)
		}
	},

	/**
	 * 驗證沒有副作用資產遺留
	 */
	async expectNoOrphanedDatabases() {
		const { existsSync } = await import('fs')
		const testDbPaths = [
			'./gravito.db',
			'./test.db',
			'./storage/test.db',
			'./storage/local.db',
		]

		const found: string[] = []
		for (const path of testDbPaths) {
			if (existsSync(path)) {
				found.push(path)
			}
		}

		if (found.length > 0) {
			throw new Error(`Found orphaned test databases: ${found.join(', ')}`)
		}
	},
}

/**
 * 等待函數
 */
export async function waitFor(
	condition: () => boolean,
	timeout = 1000,
	interval = 50
): Promise<void> {
	const start = Date.now()
	while (!condition()) {
		if (Date.now() - start > timeout) {
			throw new Error(`Timeout waiting for condition after ${timeout}ms`)
		}
		await new Promise((resolve) => setTimeout(resolve, interval))
	}
}

/**
 * 延遲執行
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Mock HTTP 回應
 */
export class MockResponse {
	constructor(
		public status: number,
		public body: any,
		public headers: Record<string, string> = {}
	) {}

	json() {
		return Promise.resolve(this.body)
	}

	text() {
		return Promise.resolve(JSON.stringify(this.body))
	}
}

/**
 * Mock HTTP 客戶端
 */
export class MockHttpClient {
	private responses = new Map<string, MockResponse>()

	stub(method: string, path: string, response: MockResponse) {
		const key = `${method} ${path}`
		this.responses.set(key, response)
		return this
	}

	async request(method: string, path: string) {
		const key = `${method} ${path}`
		const response = this.responses.get(key)
		if (!response) {
			throw new Error(`No stub found for: ${key}`)
		}
		return response
	}

	reset() {
		this.responses.clear()
	}
}

export default {
	createRepositoryTest,
	createServiceTest,
	DataFactory,
	testAssertions,
	waitFor,
	delay,
	MockResponse,
	MockHttpClient,
}
