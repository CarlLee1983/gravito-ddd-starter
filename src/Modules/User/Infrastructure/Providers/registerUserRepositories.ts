/**
 * User 模組 Repository 工廠註冊
 *
 * 使用 RepositoryFactoryGenerator 消除重複代碼
 * 只需定義 Repository 類的映射，工廠邏輯自動生成
 *
 * 設計優勢：
 * - ✅ 無重複代碼（使用工廠生成器）
 * - ✅ 簡潔清晰
 * - ✅ 易於擴展（新增 ORM 時只改映射）
 * - ✅ 類型安全
 */

import { UserRepository } from '../Persistence/UserRepository'
import { DrizzleUserRepository } from '@/adapters/Drizzle/Repositories/DrizzleUserRepository'
import { createRepositoryFactory } from '@/wiring/RepositoryFactoryGenerator'
import { getRegistry } from '@/wiring/RepositoryRegistry'

/**
 * 註冊 User Repository 工廠到全局 Registry
 *
 * 使用 createRepositoryFactory 消除 switch/case 重複代碼
 *
 * @example
 * registerUserRepositories()
 */
export function registerUserRepositories(): void {
	const registry = getRegistry()

	// 定義 Repository 映射（簡潔！）
	const factory = createRepositoryFactory({
		memory: () => new UserRepository(),
		drizzle: (db) => new DrizzleUserRepository(db!),
		// atlas: (db) => new AtlasUserRepository(db!),      // 未來
		// prisma: (db) => new PrismaUserRepository(db!),    // 未來
	})

	registry.register('user', factory)
	console.log('✅ [User] Repository 工廠已註冊')
}
