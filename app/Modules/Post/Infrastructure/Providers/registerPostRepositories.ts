/**
 * @file registerPostRepositories.ts
 * @description 向全局倉儲註冊中心 (RepositoryRegistry) 註冊 Post 倉儲工廠
 * @module src/Modules/Post/Infrastructure/Providers
 */

import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Infrastructure/Ports/Messaging/IEventDispatcher'
import { RepositoryRegistry } from '@wiring/RepositoryRegistry'
import { PostRepository } from '../Repositories/PostRepository'

/**
 * 註冊 Post Repository 工廠到註冊表
 *
 * 在 DDD 架構中屬於「基礎設施層 (Infrastructure Layer)」。
 * 此函數將建立 PostRepository 實例的邏輯封裝在工廠函數中並進行註冊。
 *
 * @param db - 資料庫存取介面實例 (port)，由 DatabaseAccessBuilder 提供
 * @param eventDispatcher - 事件分派器（可選），用於發佈領域事件
 * @param registry - Repository 註冊表（從容器解析，P2 修復）
 * @returns void
 */
export function registerPostRepositories(
	db: IDatabaseAccess,
	eventDispatcher?: IEventDispatcher,
	registry?: RepositoryRegistry
): void {
	if (!registry) {
		throw new Error(
			'❌ RepositoryRegistry 未提供。\n' +
				'registerPostRepositories() 應由 ModuleAutoWirer 呼叫，它負責傳遞 Registry。'
		)
	}
	const factory = (_orm: string, _db: IDatabaseAccess | undefined) => {
		return new PostRepository(db, eventDispatcher)
	}

	registry.register('post', factory)
	console.log('✅ [Post] Repository 工廠已註冊')
}
