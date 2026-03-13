/**
 * @file registerPostRepositories.ts
 * @description 向全局倉儲註冊中心 (RepositoryRegistry) 註冊 Post 倉儲工廠
 * @module src/Modules/Post/Infrastructure/Providers
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { PostRepository } from '../Repositories/PostRepository'
import { getRegistry } from '@wiring/RepositoryRegistry'

/**
 * 註冊 Post Repository 工廠到全局 Registry
 * 
 * 在 DDD 架構中屬於「基礎設施層 (Infrastructure Layer)」。
 * 此函數將建立 PostRepository 實例的邏輯封裝在工廠函數中並進行註冊。
 *
 * @param db - 資料庫存取介面實例 (port)，由 DatabaseAccessBuilder 提供
 * @returns void
 */
export function registerPostRepositories(db: IDatabaseAccess): void {
	const registry = getRegistry()
	const factory = (_orm: string, _db: IDatabaseAccess | undefined) => {
		return new PostRepository(db)
	}

	registry.register('post', factory)
	console.log('✅ [Post] Repository 工廠已註冊')
}
