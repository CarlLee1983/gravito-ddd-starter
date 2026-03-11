/**
 * User 模組 Repository 工廠註冊
 *
 * 架構特點：
 * ✅ IDatabaseAccess 由上層 bootstrap 透過 DatabaseAccessBuilder 注入（無 DB 時為 MemoryDatabaseAccess）
 * ✅ UserRepository 僅依賴 IDatabaseAccess，無底層 if (db) 分支
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { UserRepository } from '../Persistence/UserRepository'
import { getRegistry } from '@/wiring/RepositoryRegistry'

/**
 * 註冊 User Repository 工廠到全局 Registry
 *
 * @param db 由 DatabaseAccessBuilder.getDatabaseAccess() 提供（必為非 undefined，memory 時為 MemoryDatabaseAccess）
 */
export function registerUserRepositories(db: IDatabaseAccess): void {
	const registry = getRegistry()
	const factory = (_orm: string, _db: IDatabaseAccess | undefined) => {
		return new UserRepository(db)
	}

	registry.register('user', factory)
	console.log('✅ [User] Repository 工廠已註冊')
}
