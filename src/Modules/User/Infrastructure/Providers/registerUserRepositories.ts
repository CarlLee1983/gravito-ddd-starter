/**
 * User 模組 Repository 工廠註冊
 *
 * 這是 User 模組對 ORM 抽換機制的貢獻
 * 每個模組在自己的檔案中定義它的 Repository 工廠
 *
 * 設計優勢：
 * - ✅ 模組自決其 Repository 實現方式
 * - ✅ 不涉及全局 RepositoryFactory 的修改
 * - ✅ 易於新增模組（複製此檔案，改模組名）
 * - ✅ 單一責任原則（每個模組一個檔案）
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { UserRepository } from '../Persistence/UserRepository'
import { DrizzleUserRepository } from '@/adapters/Drizzle/Repositories/DrizzleUserRepository'
import { getRegistry } from '@/wiring/RepositoryRegistry'

/**
 * User Repository 工廠函數
 *
 * 根據 ORM 類型返回對應的 Repository 實現
 */
function createUserRepository(
	orm: string,
	databaseAccess: IDatabaseAccess | undefined
): any {
	switch (orm) {
		case 'memory':
			return new UserRepository()

		case 'drizzle':
			if (!databaseAccess) {
				throw new Error(
					'❌ ORM=drizzle 需要 DatabaseAccess。\n' +
						'請確保 DATABASE_URL 已設定。'
				)
			}
			return new DrizzleUserRepository(databaseAccess)

		case 'atlas':
			// TODO: 實現 AtlasUserRepository
			throw new Error('❌ Atlas ORM 尚未實現')

		case 'prisma':
			// TODO: 實現 PrismaUserRepository
			throw new Error('❌ Prisma ORM 尚未實現')

		default:
			throw new Error(`❌ 不支援的 ORM: "${orm}"`)
	}
}

/**
 * 註冊 User Repository 工廠到全局 Registry
 *
 * 應在 bootstrap 時被呼叫
 * （在 UserServiceProvider.register() 之前）
 *
 * @example
 * registerUserRepositories()
 */
export function registerUserRepositories(): void {
	const registry = getRegistry()
	registry.register('user', createUserRepository)
	console.log('✅ [User] Repository 工廠已註冊')
}
