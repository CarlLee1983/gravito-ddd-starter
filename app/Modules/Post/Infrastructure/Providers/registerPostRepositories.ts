/**
 * @file registerPostRepositories.ts
 * @description 向全局倉儲註冊中心 (RepositoryRegistry) 註冊 Post 倉儲工廠
 * @module src/Modules/Post/Infrastructure/Providers
 */

import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Application/Ports/IEventDispatcher'
import { RepositoryRegistry } from '@wiring/RepositoryRegistry'
import { PostRepository } from '../Repositories/PostRepository'

/**
 * 註冊 Post Repository 到容器
 *
 * Phase 3 遷移：改為直接向容器註冊 Repository 實例
 * 消除 resolveRepository() 的全局依賴
 *
 * @param db - 資料庫存取介面實例 (port)，由 DatabaseAccessBuilder 提供
 * @param eventDispatcher - 事件分派器（可選），用於發佈領域事件
 * @param registry - 保留以支持向後相容，但不再使用
 * @param container - DI 容器，直接向其註冊 Repository
 * @returns void
 */
export function registerPostRepositories(
	db: IDatabaseAccess,
	eventDispatcher?: IEventDispatcher,
	registry?: RepositoryRegistry,
	container?: any
): void {
	if (!container) {
		throw new Error(
			'❌ Container 未提供。\n' +
				'registerPostRepositories() 應由 ModuleAutoWirer 呼叫，它負責傳遞 Container。'
		)
	}

	// 直接向容器註冊 Repository 實例
	container.singleton('postRepository', () => {
		return new PostRepository(db, eventDispatcher)
	})
}
