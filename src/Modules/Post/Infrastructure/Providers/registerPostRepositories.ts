/**
 * Post 模組 Repository 工廠註冊
 *
 * 架構特點（完全重構）：
 * ✅ Repository 完全對 ORM 實現無感知
 * ✅ IDatabaseAccess 由上層 bootstrap 層通過 DatabaseAccessBuilder 注入
 * ✅ PostRepository 根據 IDatabaseAccess 是否存在自動選擇內存或數據庫模式
 * ✅ 無需為每個 ORM 創建不同的 Repository 類
 *
 * 使用流程：
 * 1. bootstrap.ts 中：const orm = getCurrentORM()
 * 2. bootstrap.ts 中：const db = new DatabaseAccessBuilder(orm).getDatabaseAccess()
 * 3. bootstrap.ts 中：registerPostRepositories(db)
 * 4. 此函數接收 IDatabaseAccess，創建 PostRepository 實例
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { PostRepository } from '../Repositories/PostRepository'
import { getRegistry } from '@/wiring/RepositoryRegistry'

/**
 * 註冊 Post Repository 工廠到全局 Registry
 *
 * 簡潔設計：
 * - 接收上層決定的 IDatabaseAccess（可能是 undefined 或具體實現）
 * - 建立 PostRepository 實例並註冊到 Registry
 * - PostRepository 內部根據 IDatabaseAccess 決定實現方式
 *
 * @param db 由 DatabaseAccessBuilder 提供的 IDatabaseAccess
 *          - undefined：使用內存實現
 *          - IDatabaseAccess：使用數據庫實現
 *
 * @example
 * // 在 bootstrap.ts 中
 * const orm = getCurrentORM()
 * const db = new DatabaseAccessBuilder(orm).getDatabaseAccess()
 * registerPostRepositories(db)
 */
export function registerPostRepositories(db: IDatabaseAccess | undefined): void {
	const registry = getRegistry()

	// 建立 PostRepository 工廠
	// 重要：這是唯一的 PostRepository，不管使用什麼 ORM
	const factory = (_orm: string, _db: IDatabaseAccess | undefined) => {
		return new PostRepository(db)
	}

	registry.register('post', factory)
	console.log('✅ [Post] Repository 工廠已註冊')
}
