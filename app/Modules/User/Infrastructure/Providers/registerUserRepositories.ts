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

import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Infrastructure/Ports/Messaging/IEventDispatcher'
import { RepositoryRegistry } from '@wiring/RepositoryRegistry'
import { UserRepository } from '../Persistence/UserRepository'

/**
 * 註冊 User Repository 到容器
 *
 * Phase 3 遷移：改為直接向容器註冊 Repository 實例
 * 消除 resolveRepository() 的全局依賴
 *
 * @param db - 資料庫存取介面
 * @param eventDispatcher - 領域事件分發器
 * @param registry - 保留以支持向後相容，但不再使用
 * @param container - DI 容器，直接向其註冊 Repository
 */
export function registerUserRepositories(
	db: IDatabaseAccess,
	eventDispatcher?: IEventDispatcher,
	registry?: RepositoryRegistry,
	container?: any
): void {
	if (!container) {
		throw new Error(
			'❌ Container 未提供。\n' +
				'registerUserRepositories() 應由 ModuleAutoWirer 呼叫，它負責傳遞 Container。'
		)
	}

	// 直接向容器註冊 Repository 實例
	container.singleton('userRepository', () => {
		return new UserRepository(db, eventDispatcher)
	})
}
