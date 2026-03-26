/**
 * @file registerRefundRepositories.ts
 * @description Refund 模組 Repository 工廠註冊
 *
 * 由 ModuleAutoWirer 調用，負責：
 * 1. 向全局倉儲註冊中心 (RepositoryRegistry) 註冊 Refund 倉儲工廠
 * 2. 封裝 RefundRepository 的建立邏輯，包括注入 db 與 eventDispatcher
 */

import { RefundRepository } from '../Repositories/RefundRepository'
import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Application/Ports/IEventDispatcher'
import { RepositoryRegistry } from '@wiring/RepositoryRegistry'

/**
 * 註冊 Refund Repository 工廠到全局 Registry
 *
 * @param db - 資料庫存取介面實例 (port)，由 DatabaseAccessBuilder 提供
 * @param eventDispatcher - 事件分派器（可選），用於發佈整合事件
 * @param repositoryRegistry - Repository 全局註冊中心（unknown 型別，符合 IModuleDefinition）
 * @param _container - DI 容器（選填，此模組不需要）
 */
export function registerRefundRepositories(
	db: IDatabaseAccess,
	eventDispatcher?: IEventDispatcher,
	repositoryRegistry?: unknown,
	_container?: { singleton(name: string, factory: (c: any) => any): void }
): void {
	const registry = repositoryRegistry as RepositoryRegistry | undefined
	if (!registry) throw new Error('RepositoryRegistry not provided')

	const factory = (_orm: string, _db: IDatabaseAccess | undefined) => {
		return new RefundRepository(db, eventDispatcher)
	}

	registry.register('refund', factory)
}
