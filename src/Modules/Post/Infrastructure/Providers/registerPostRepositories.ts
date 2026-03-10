/**
 * Post 模組 Repository 工廠註冊
 *
 * 這是 Post 模組對 ORM 抽換機制的貢獻
 * 展示如何為一個新模組添加 Repository 工廠
 *
 * 複製此檔案用於新模組：
 * 1. 改模組名 (Post → YourModule)
 * 2. 改 import 路徑
 * 3. 改工廠函數名稱
 * 4. 在 bootstrap 中呼叫
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { PostRepository } from '../Repositories/PostRepository'
import { DrizzlePostRepository } from '@/adapters/Drizzle/Repositories/DrizzlePostRepository'
import { getRegistry } from '@/wiring/RepositoryRegistry'

/**
 * Post Repository 工廠函數
 *
 * 根據 ORM 類型返回對應的 Repository 實現
 */
function createPostRepository(
	orm: string,
	databaseAccess: IDatabaseAccess | undefined
): any {
	switch (orm) {
		case 'memory':
			// Post 的 in-memory 實現需要 DatabaseAccess
			// 如果運行在 memory 模式下，創建一個簡單的 mock
			if (!databaseAccess) {
				console.warn(
					'⚠️ Post Repository (memory) 通常需要 DatabaseAccess\n' +
						'目前使用簡化版本，可能功能受限。'
				)
			}
			// 即使在 memory 模式，也傳遞 databaseAccess 以相同接口
			return new PostRepository(databaseAccess!)

		case 'drizzle':
			if (!databaseAccess) {
				throw new Error(
					'❌ ORM=drizzle 需要 DatabaseAccess。\n' +
						'請確保 DATABASE_URL 已設定。'
				)
			}
			return new DrizzlePostRepository(databaseAccess)

		case 'atlas':
			// TODO: 實現 AtlasPostRepository
			throw new Error('❌ Atlas ORM 尚未實現')

		case 'prisma':
			// TODO: 實現 PrismaPostRepository
			throw new Error('❌ Prisma ORM 尚未實現')

		default:
			throw new Error(`❌ 不支援的 ORM: "${orm}"`)
	}
}

/**
 * 註冊 Post Repository 工廠到全局 Registry
 *
 * 應在 bootstrap 時被呼叫
 * （在 PostServiceProvider.register() 之前）
 *
 * @example
 * registerPostRepositories()
 */
export function registerPostRepositories(): void {
	const registry = getRegistry()
	registry.register('post', createPostRepository)
	console.log('✅ [Post] Repository 工廠已註冊')
}
