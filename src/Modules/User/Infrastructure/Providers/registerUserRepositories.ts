/**
 * @file registerUserRepositories.ts
 * @description User 模組 Repository 工廠註冊器
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：作為領域與底層持久化實現的橋樑。
 * - 職責：將 User 模組的 Repository 工廠註冊到全局註冊表中，確保系統能根據配置動態創建模組所需的倉儲實例。
 *
 * 架構特點：
 * ✅ IDatabaseAccess 由上層 bootstrap 透過 DatabaseAccessBuilder 注入（無 DB 時為 MemoryDatabaseAccess）
 * ✅ UserRepository 僅依賴 IDatabaseAccess，無底層 if (db) 分支
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IEventDispatcher } from '@/Shared/Infrastructure/IEventDispatcher'
import { UserRepository } from '../Persistence/UserRepository'
import { getRegistry } from '@/wiring/RepositoryRegistry'

/**
 * 註冊 User Repository 工廠到全局註冊表 (Registry)
 *
 * @param db - 資料庫存取介面
 * @param eventDispatcher - 領域事件分發器
 */
export function registerUserRepositories(db: IDatabaseAccess, eventDispatcher?: IEventDispatcher): void {
	const registry = getRegistry()
	const factory = (_orm: string, _db: IDatabaseAccess | undefined) => {
		return new UserRepository(db, eventDispatcher)
	}

	registry.register('user', factory)
	console.log('✅ [User] Repository 工廠已註冊 (含 EventDispatcher)')
}
