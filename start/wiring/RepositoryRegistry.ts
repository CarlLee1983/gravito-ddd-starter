/**
 * @file RepositoryRegistry.ts
 * @description Repository 註冊表 - 分布式的 Repository 工廠註冊中心
 *
 * 在 DDD 架構中的角色：
 * - 接線層 (Wiring Layer)：連接領域契約與基礎設施實現的關鍵組件。
 * - 職責：管理所有模組的 Repository 工廠，支援 ORM 的動態切換與解耦。
 *
 * 設計原則：
 * - 每個模組自己註冊其 Repository 工廠
 * - 避免 RepositoryFactory 的單點擁堵（monolithic factory）
 * - 遵循開放封閉原則（Open/Closed Principle）
 * - 新增模組時無需修改此檔案
 *
 * 架構：
 * ```
 * Module A                          Module B
 * └─ registerRepositories()         └─ registerRepositories()
 *    └─ registry.register()            └─ registry.register()
 *
 * All → RepositoryRegistry
 *       └─ RepositoryFactory
 *          └─ ORM 選擇邏輯
 * ```
 */

import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'

/**
 * Repository 工廠函數類型
 * 每個模組為其 Repository 提供一個工廠函數
 *
 * @param orm - 當前使用的 ORM 類型名稱
 * @param databaseAccess - 資料庫存取適配器 (可選)
 * @returns 任何類型的 Repository 實例
 */
export type RepositoryFactory = (
	orm: string,
	databaseAccess: IDatabaseAccess | undefined
) => any

/**
 * Repository Registry 類別 - 集中管理所有模組的 Repository 工廠
 *
 * 好處：
 * - ✅ 每個模組在自己的檔案中註冊工廠
 * - ✅ RepositoryFactory 不需要知道所有模組
 * - ✅ 新增模組時無需修改此檔案
 * - ✅ 易於測試和模擬
 */
export class RepositoryRegistry {
	/** 儲存已註冊工廠的映射表 */
	private factories = new Map<string, RepositoryFactory>()

	/**
	 * 註冊一個 Repository 工廠
	 *
	 * @param type - Repository 類型（例如 'user'、'post'、'order' 等）
	 * @param factory - 工廠函數，定義如何根據 ORM 建立該類型的實例
	 * @param logger - 可選的 ILogger 實例，用於警告訊息
	 *
	 * @example
	 * registry.register('user', (orm, db) => {
	 *   if (orm === 'memory') return new UserRepository()
	 *   if (orm === 'drizzle') return new DrizzleUserRepository(db!)
	 * })
	 */
	register(type: string, factory: RepositoryFactory, logger?: any): void {
		if (this.factories.has(type)) {
			const message = `⚠️ Repository type "${type}" 已被註冊，將覆寫`
			if (logger) {
				logger.warn(message)
			} else {
				console.warn(message)
			}
		}
		this.factories.set(type, factory)
	}

	/**
	 * 根據類型與當前 ORM 建立 Repository 實例
	 *
	 * @param type - Repository 類型
	 * @param orm - 當前選擇的 ORM 名稱
	 * @param databaseAccess - 資料庫適配器實例（可選）
	 * @returns 已建立的 Repository 實例
	 *
	 * @throws 如果指定的 Repository 類型尚未註冊
	 */
	create(type: string, orm: string, databaseAccess: IDatabaseAccess | undefined): any {
		const factory = this.factories.get(type)

		if (!factory) {
			throw new Error(
				`❌ Repository 類型 "${type}" 未註冊。\n` +
					`已註冊的類型：${Array.from(this.factories.keys()).join(', ')}`
			)
		}

		return factory(orm, databaseAccess)
	}

	/**
	 * 取得所有目前已註冊的 Repository 類型名稱
	 *
	 * @returns 類型名稱陣列
	 */
	listRegistered(): string[] {
		return Array.from(this.factories.keys())
	}

	/**
	 * 檢查特定的 Repository 類型是否已經註冊
	 *
	 * @param type - 類型名稱
	 * @returns 是否存在
	 */
	has(type: string): boolean {
		return this.factories.has(type)
	}
}

/**
 * 全局 Registry 單例參考（向後相容）
 *
 * 遷移中：優先使用容器管理的 Registry
 * 但保留全局單例以支持舊的 getRegistry() 呼叫
 */
let globalRegistry: RepositoryRegistry | null = null

/**
 * 初始化全局註冊表（向後相容）
 *
 * ⚠️ 棄用：應改用容器管理的 Registry
 * 新代碼應使用: container.make("repositoryRegistry")
 */
export function initializeRegistry(): RepositoryRegistry {
	if (!globalRegistry) {
		globalRegistry = new RepositoryRegistry()
	}
	return globalRegistry
}

/**
 * 獲取全局 Registry 實例（向後相容）
 *
 * ⚠️ 棄用：應改用容器管理的 Registry
 * 新代碼應使用: container.make("repositoryRegistry")
 *
 * 此函數保留以支持現有的 Service Provider 實現
 * Phase 3 遷移時改為注入容器實例
 */
export function getRegistry(): RepositoryRegistry {
	if (!globalRegistry) {
		globalRegistry = new RepositoryRegistry()
	}
	return globalRegistry
}

/**
 * 重設註冊表（向後相容，用於測試隔離）
 */
export function resetRegistry(): void {
	globalRegistry = null
}
