/**
 * @file registerCartRepositories.ts
 * @description Cart 模組 Repository 工廠註冊
 *
 * 由 ModuleAutoWirer 調用，負責：
 * 1. 向全局倉儲註冊中心 (RepositoryRegistry) 註冊 Cart 倉儲工廠
 * 2. 封裝 CartRepository 的建立邏輯，包括注入 db, eventDispatcher 與 eventStore
 */

import { CartRepository } from '../Persistence/CartRepository'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Shared/Infrastructure/Ports/Messaging/IEventDispatcher'
import type { IEventStore } from '@/Shared/Infrastructure/Ports/Database/IEventStore'
import { getRegistry } from '@wiring/RepositoryRegistry'

/**
 * 註冊 Cart Repository 工廠到全局 Registry
 *
 * @param db - 資料庫存取介面實例 (port)，由 DatabaseAccessBuilder 提供
 * @param eventDispatcher - 事件分派器（可選），用於發佈領域事件
 */
export function registerCartRepositories(db: IDatabaseAccess, eventDispatcher?: IEventDispatcher): void {
	const registry = getRegistry()
	
	const factory = (_orm: string, _db: IDatabaseAccess | undefined) => {
		// 注意：eventStore 通常需要從容器中解析，這裡假設它與 db 同級或是通過 db 內部獲取
		// 在我們的架構中，如果需要 eventStore，可以嘗試從 db 獲取或在此處初始化一個
		const eventStore = undefined // 或者從某處獲取 IEventStore 實例
		
		return new CartRepository(db, eventDispatcher, eventStore)
	}

	registry.register('cart', factory)
	console.log('✅ [Cart] Repository 工廠已註冊')
}
