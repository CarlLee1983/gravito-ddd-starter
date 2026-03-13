/**
 * @file registerCartRepositories.ts
 * @description Cart 模組 Repository 工廠註冊
 *
 * 由 ModuleAutoWirer 調用，負責：
 * 1. 在容器中註冊 CartRepository 實現
 * 2. 綁定 ICartRepository Port
 * 3. 配置事件分派和 EventStore
 */

import type { Container } from '@gravito/core'
import { CartRepository } from '../Persistence/CartRepository'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Shared/Infrastructure/Ports/Messaging/IEventDispatcher'
import type { IEventStore } from '@/Shared/Infrastructure/Ports/Database/IEventStore'

/**
 * 註冊 Cart Repository 至容器
 *
 * @param container - DI 容器
 */
export function registerCartRepositories(container: Container): void {
	// 註冊 CartRepository 實現為單例
	// ICartRepository 介面由此實現提供
	container.singleton('cartRepository', (c) => {
		const db = c.make('database') as IDatabaseAccess
		const eventDispatcher = c.make('eventDispatcher') as IEventDispatcher | undefined
		const eventStore = c.make('eventStore') as IEventStore | undefined

		return new CartRepository(db, eventDispatcher, eventStore)
	})

	// 配置 ICartRepository Port 介面綁定
	container.bind('iCartRepository', (c) => c.make('cartRepository'))
}
