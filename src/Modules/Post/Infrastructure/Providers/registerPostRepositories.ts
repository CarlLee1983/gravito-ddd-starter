/**
 * Post 模組 Repository 工廠註冊
 *
 * 架構特點：
 * ✅ IDatabaseAccess 由上層 bootstrap 透過 DatabaseAccessBuilder 注入（無 DB 時為 MemoryDatabaseAccess）
 * ✅ PostRepository 僅依賴 IDatabaseAccess，無底層 if (db) 分支
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { PostRepository } from '../Repositories/PostRepository'
import { getRegistry } from '@/wiring/RepositoryRegistry'

/**
 * 註冊 Post Repository 工廠到全局 Registry
 *
 * @param db 由 DatabaseAccessBuilder.getDatabaseAccess() 提供（必為非 undefined，memory 時為 MemoryDatabaseAccess）
 */
export function registerPostRepositories(db: IDatabaseAccess): void {
	const registry = getRegistry()
	const factory = (_orm: string, _db: IDatabaseAccess | undefined) => {
		return new PostRepository(db)
	}

	registry.register('post', factory)
	console.log('✅ [Post] Repository 工廠已註冊')
}
