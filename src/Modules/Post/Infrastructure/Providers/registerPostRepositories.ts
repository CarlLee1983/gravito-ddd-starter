/**
 * Post 模組 Repository 工廠註冊
 *
 * 使用 RepositoryFactoryGenerator 消除重複代碼
 * 只需定義 Repository 類的映射，工廠邏輯自動生成
 *
 * 設計優勢：
 * - ✅ 無重複代碼（使用工廠生成器）
 * - ✅ 簡潔清晰（只有 5 行！）
 * - ✅ 易於複製給新模組
 * - ✅ 易於擴展（新增 ORM 時只改映射）
 */

import { PostRepository } from '../Repositories/PostRepository'
import { DrizzlePostRepository } from '@/adapters/Drizzle/Repositories/DrizzlePostRepository'
import { createRepositoryFactory } from '@/wiring/RepositoryFactoryGenerator'
import { getRegistry } from '@/wiring/RepositoryRegistry'

/**
 * 註冊 Post Repository 工廠到全局 Registry
 *
 * 使用 createRepositoryFactory 消除 switch/case 重複代碼
 *
 * @example
 * registerPostRepositories()
 */
export function registerPostRepositories(): void {
	const registry = getRegistry()

	// 定義 Repository 映射（簡潔！）
	// 注意：Post Repository 的 in-memory 版本也需要 DatabaseAccess
	// 但在 memory 模式下我們使用簡單的實現
	const factory = createRepositoryFactory({
		memory: () => new PostRepository(undefined as any),
		drizzle: (db) => new DrizzlePostRepository(db!),
		// atlas: (db) => new AtlasPostRepository(db!),      // 未來
		// prisma: (db) => new PrismaPostRepository(db!),    // 未來
	})

	registry.register('post', factory)
	console.log('✅ [Post] Repository 工廠已註冊')
}
