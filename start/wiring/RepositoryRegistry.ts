/**
 * @file RepositoryRegistry.ts
 * @description Repository 註冊表 - 分布式的 Repository 工廠註冊中心
 *
 * 在 DDD 架構中的角色：
 * - 接線層 (Wiring Layer)：連接領域契約與基礎設施實現的關鍵組件。
 * - 職責：管理所有模組的 Repository 工廠，支援 ORM 的動態切換與解耦。
 *
 * P4 遷移（已完成）：
 * - ✅ 移除全局單例（globalRegistry）
 * - ✅ 容器管理所有 RepositoryRegistry 實例
 * - ✅ 無全局狀態依賴
 *
 * 設計原則：
 * - 每個模組在 registerRepositories 中向容器註冊 Repository 實例
 * - RepositoryRegistry 僅作為 Registry 服務，由容器管理
 * - 新增模組時無需修改此檔案
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
 * Repository Registry 類別
 *
 * P4 遷移後的角色：
 * - 純服務類別，由容器管理
 * - 不再有全局單例
 * - 支援模組向容器直接註冊 Repository 實例時進行驗證
 *
 * 使用場景（已棄用）：
 * - 早期 ORM 工廠註冊（已改為直接向容器註冊）
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
	register(type: string, factory: RepositoryFactory): void {
		if (this.factories.has(type)) {
			throw new Error(
				`❌ Repository type "${type}" 已被註冊。\n` +
					`若要更新，請先調用 unregister("${type}") 或在初始化時使用不同的類型。`
			)
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
 * @deprecated P4 遷移：全局單例已移除
 *
 * 替代方案：使用容器管理的 RepositoryRegistry
 * ```typescript
 * const registry = container.make('repositoryRegistry') as RepositoryRegistry
 * ```
 */
export function initializeRegistry(): RepositoryRegistry {
	throw new Error(
		'❌ initializeRegistry() 已廢棄 (P4 遷移)。\n' +
			'應改用容器管理的 Registry：\n' +
			'  const registry = container.make("repositoryRegistry")'
	)
}

/**
 * @deprecated P4 遷移：全局單例已移除
 *
 * 替代方案：使用容器管理的 RepositoryRegistry
 * ```typescript
 * const registry = container.make('repositoryRegistry') as RepositoryRegistry
 * ```
 */
export function getRegistry(): RepositoryRegistry {
	throw new Error(
		'❌ getRegistry() 已廢棄 (P4 遷移)。\n' +
			'應改用容器管理的 Registry：\n' +
			'  const registry = container.make("repositoryRegistry")'
	)
}

/**
 * @deprecated P4 遷移：全局單例已移除
 *
 * 此函數已無實際作用
 */
export function resetRegistry(): void {
	// P4 遷移後，不再有全局單例需要重置
}
