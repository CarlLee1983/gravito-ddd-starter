/**
 * 容器 & 依賴注入可替換性測試
 *
 * 驗證：
 * 1. IContainer 介面被完全實現
 * 2. 服務可以被註冊和解析
 * 3. 單例模式正確運作
 * 4. 不同適配器可以無縫交換
 *
 * 這測試模擬「wiring 層」，確保 ORM 切換時只需改變導入路徑
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import type { IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import { ModuleServiceProvider } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import { resetRegistry } from '@wiring'

/**
 * 簡單的容器實現（用於測試）
 */
class SimpleContainer implements IContainer {
	private services: Map<string, Function> = new Map()
	private singletons: Map<string, any> = new Map()
	private factories: Map<string, Function> = new Map()

	singleton(name: string, factory: (container: IContainer) => any): void {
		this.factories.set(name, factory)
		this.singletons.delete(name)
	}

	bind(name: string, factory: (container: IContainer) => any): void {
		this.services.set(name, factory)
	}

	make(name: string): any {
		// 檢查是否有單例已建立
		if (this.singletons.has(name)) {
			return this.singletons.get(name)
		}

		// 檢查是否有單例工廠
		if (this.factories.has(name)) {
			const factory = this.factories.get(name)!
			const instance = factory(this)
			this.singletons.set(name, instance)
			return instance
		}

		// 檢查是否有一般綁定
		if (this.services.has(name)) {
			const factory = this.services.get(name)!
			return factory(this)
		}

		throw new Error(`Service "${name}" not found in container`)
	}

	/**
	 * 測試工具：手動清除單例快取
	 */
	forget(name: string): void {
		this.singletons.delete(name)
	}
}

describe('容器 & 依賴注入 - 可替換性測試', () => {
	let container: SimpleContainer

	beforeEach(() => {
		container = new SimpleContainer()
		resetRegistry()
	})

	describe('基本註冊和解析', () => {
		it('應該註冊和解析單例', () => {
			const value = { id: 'test' }
			container.singleton('test', () => value)

			const resolved = container.make('test')
			expect(resolved).toBe(value)
		})

		it('應該註冊和解析一般綁定', () => {
			container.bind('factory', () => ({ created: true }))

			const result1 = container.make('factory')
			const result2 = container.make('factory')

			expect(result1).toBeDefined()
			expect(result2).toBeDefined()
			// 每次調用應該返回不同的實例
			expect(result1).not.toBe(result2)
		})

		it('單例應該返回相同的實例', () => {
			container.singleton('service', () => ({ id: Math.random() }))

			const instance1 = container.make('service')
			const instance2 = container.make('service')

			expect(instance1).toBe(instance2)
			expect(instance1.id).toBe(instance2.id)
		})

		it('應該支援容器作為參數傳遞', () => {
			container.singleton('db', () => ({ connected: true }))
			container.singleton('repository', (c) => ({
				db: c.make('db'),
			}))

			const repo = container.make('repository') as any
			expect(repo.db.connected).toBe(true)
		})
	})

	describe('依賴注入鏈', () => {
		it('應該解決多層依賴', () => {
			// 模擬 ORM 適配器
			container.singleton('db', () => ({
				table: () => ({}),
			} as unknown as IDatabaseAccess))

			// 模擬 Repository
			container.singleton('userRepository', (c) => ({
				db: c.make('db'),
				findById: async () => null,
			}))

			// 模擬 Service
			container.singleton('userService', (c) => ({
				repository: c.make('userRepository'),
				getUser: async () => null,
			}))

			// 模擬 Controller
			container.singleton('userController', (c) => ({
				service: c.make('userService'),
				show: async () => ({}),
			}))

			const controller = container.make('userController') as any
			expect(controller.service).toBeDefined()
			expect(controller.service.repository).toBeDefined()
			expect(controller.service.repository.db).toBeDefined()
		})

		it('應該支援條件依賴（例：Atlas vs Drizzle）', () => {
			// 情景 1：使用 Atlas
			container.singleton('database', () => ({
				name: 'Atlas',
				table: () => ({}),
			} as any))

			let db = container.make('database') as any
			expect(db.name).toBe('Atlas')

			// 情景 2：切換到 Drizzle
			// 注意：在真實應用中，這通常在啟動時決定一次
			// 測試中我們手動重新註冊
			container.singleton('database', () => ({
				name: 'Drizzle',
				table: () => ({}),
			} as any))

			db = container.make('database') as any
			expect(db.name).toBe('Drizzle')
		})
	})

	describe('適配器可替換性模式', () => {
		it('應該支援 ORM 無關的 Repository 註冊', () => {
			// 步驟 1：註冊數據庫訪問（adaptable）
			const mockAtlasDb = {
				name: 'Atlas',
				table: () => ({
					where: () => ({ first: async () => null }),
				}),
			} as any

			container.singleton('database', () => mockAtlasDb)

			// 步驟 2：註冊 Repository（依賴 database）
			container.singleton('userRepository', (c) => ({
				db: c.make('database'),
				findById: async () => null,
			}))

			// 步驟 3：解析並驗證
			const repo = container.make('userRepository') as any
			expect(repo.db.name).toBe('Atlas')

			// 步驟 4：切換數據庫適配器
			const mockDrizzleDb = {
				name: 'Drizzle',
				table: () => ({
					where: () => ({ first: async () => null }),
				}),
			} as any

			container.singleton('database', () => mockDrizzleDb)
			
			// 因為 userRepository 是單例且已被解析，我們需要清除它或重新註冊它
			// 模擬重新裝配流程
			container.forget('userRepository')

			const repoAfterSwitch = container.make('userRepository') as any
			expect(repoAfterSwitch.db.name).toBe('Drizzle')
		})

		it('應該支援工廠函數進行適配器選擇', () => {
			const env = 'atlas' as string

			// 動態選擇適配器
			container.singleton('database', () => {
				if (env === 'drizzle') {
					return { type: 'Drizzle', table: () => ({}) } as any
				}
				return { type: 'Atlas', table: () => ({}) } as any
			})

			const db = container.make('database') as any
			expect(['Atlas', 'Drizzle']).toContain(db.type)
		})
	})

	describe('服務提供者模式', () => {
		it('應該支援 register 和 boot 生命週期', () => {
			const calls: string[] = []

			class TestServiceProvider extends ModuleServiceProvider {
				override register(c: IContainer): void {
					calls.push('register')
					c.singleton('service', () => ({ name: 'test' }))
				}

				override boot(): void {
					calls.push('boot')
				}
			}

			const provider = new TestServiceProvider()
			provider.register(container)
			provider.boot()

			expect(calls).toEqual(['register', 'boot'])
			expect(container.make('service')).toBeDefined()
		})

		it('應該允許多個提供者並共享容器', () => {
			class DatabaseProvider extends ModuleServiceProvider {
				override register(c: IContainer): void {
					c.singleton('db', () => ({ type: 'database' }))
				}
			}

			class RepositoryProvider extends ModuleServiceProvider {
				override register(c: IContainer): void {
					c.singleton('userRepository', (cc) => ({
						db: cc.make('db'),
					}))
				}
			}

			const dbProvider = new DatabaseProvider()
			const repoProvider = new RepositoryProvider()

			dbProvider.register(container)
			repoProvider.register(container)

			const repo = container.make('userRepository') as any
			expect(repo.db.type).toBe('database')
		})
	})

	describe('錯誤處理', () => {
		it('應該在未找到服務時拋出錯誤', () => {
			expect(() => {
				container.make('nonexistent')
			}).toThrow()
		})
	})

	describe('診斷', () => {
		it('應該能解析註冊過的服務', () => {
			container.singleton('db', () => ({}))
			container.singleton('cache', () => ({}))
			container.bind('repository', () => ({}))

			expect(container.make('db')).toBeDefined()
			expect(container.make('cache')).toBeDefined()
			expect(container.make('repository')).toBeDefined()
		})
	})
})
