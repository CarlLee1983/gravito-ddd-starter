/**
 * Repository Factory - 統一的 ORM 選擇點
 *
 * 設計原則：
 * - 提供統一的 Factory 函式用於選擇 Repository 實現
 * - 根據環境變數 (ORM) 或配置決定使用哪個實現
 * - 每個模組的 ServiceProvider 都可以使用此 Factory
 * - 完全不破壞既有的 ServiceProvider 結構
 *
 * 使用場景：
 *
 * // 在 UserServiceProvider.register() 中：
 * container.singleton('userRepository', () => {
 *   return createRepository('user')  // 自動選擇 in-memory 或 Drizzle
 * })
 *
 * // 在 PostServiceProvider.register() 中：
 * container.singleton('PostRepository', () => {
 *   return createRepository('post')  // 自動選擇 in-memory 或 Drizzle
 * })
 *
 * @example
 * // ORM=memory bun run dev  → 使用 in-memory Repository
 * // ORM=drizzle bun run dev → 使用 Drizzle Repository
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { UserRepository } from '@/Modules/User/Infrastructure/Persistence/UserRepository'
import { DrizzleUserRepository } from '@/adapters/Drizzle/Repositories/DrizzleUserRepository'
import { PostRepository } from '@/Modules/Post/Infrastructure/Repositories/PostRepository'
import { DrizzlePostRepository } from '@/adapters/Drizzle/Repositories/DrizzlePostRepository'

/**
 * 支援的 ORM 類型
 */
export type ORMType = 'memory' | 'drizzle' | 'atlas' | 'prisma'

/**
 * 支援的 Repository 類型
 */
export type RepositoryType = 'user' | 'post'

/**
 * 從環境變數讀取 ORM 設定
 * @returns 當前選擇的 ORM 類型
 */
export function getCurrentORM(): ORMType {
	const orm = process.env.ORM || 'memory'
	const validORMs: ORMType[] = ['memory', 'drizzle', 'atlas', 'prisma']

	if (!validORMs.includes(orm as ORMType)) {
		console.warn(`❌ 不支援的 ORM: "${orm}"，使用預設 "memory"`)
		return 'memory'
	}

	console.log(`📦 已選擇 ORM: ${orm}`)
	return orm as ORMType
}

/**
 * 建立指定類型的 Repository（自動根據 ORM 選擇實現）
 *
 * 設計：
 * - 讀取環境變數 ORM 決定使用哪個實現
 * - 如果是 memory，使用 in-memory 實現
 * - 如果是 drizzle，使用 Drizzle 實現（需要 DatabaseAccess）
 *
 * @param type Repository 類型 ('user' | 'post')
 * @param databaseAccess Database 適配器（僅在使用 DB 時需要）
 * @returns Repository 實例
 *
 * @example
 * // In-memory (預設)
 * const userRepo = createRepository('user')
 *
 * // Drizzle
 * const userRepo = createRepository('user', drizzleDb)
 */
export function createRepository<T extends RepositoryType>(
	type: T,
	databaseAccess?: IDatabaseAccess
): any {
	const orm = getCurrentORM()

	// 驗證 DB-backed 實現是否有所需依賴
	if (['drizzle', 'atlas', 'prisma'].includes(orm) && !databaseAccess) {
		throw new Error(
			`❌ ORM 設為 "${orm}" 但未提供 DatabaseAccess。\n` +
				`請傳遞 databaseAccess 參數或改用 ORM=memory`
		)
	}

	// User Repository
	if (type === 'user') {
		switch (orm) {
			case 'memory':
				return new UserRepository()

			case 'drizzle':
				return new DrizzleUserRepository(databaseAccess!)

			case 'atlas':
			case 'prisma':
				// TODO: 未來實現
				throw new Error(`❌ ORM "${orm}" 尚未實現`)

			default:
				return new UserRepository()
		}
	}

	// Post Repository
	if (type === 'post') {
		switch (orm) {
			case 'memory':
				return new PostRepository()

			case 'drizzle':
				return new DrizzlePostRepository(databaseAccess!)

			case 'atlas':
			case 'prisma':
				// TODO: 未來實現
				throw new Error(`❌ ORM "${orm}" 尚未實現`)

			default:
				return new PostRepository()
		}
	}

	throw new Error(`❌ 不支援的 Repository 類型: "${type}"`)
}

/**
 * 取得 Database Singleton（若需要）
 *
 * 設計：
 * - 如果使用 in-memory，返回 undefined
 * - 如果使用 DB-backed，初始化對應的適配器
 * - 整個應用只有一個 Database 實例（Singleton）
 *
 * @returns IDatabaseAccess 或 undefined
 */
export function getDatabaseAccess(): IDatabaseAccess | undefined {
	const orm = getCurrentORM()

	if (orm === 'memory') {
		return undefined
	}

	if (orm === 'drizzle') {
		const { createDrizzleDatabaseAccess } = require('@/adapters/Drizzle')
		return createDrizzleDatabaseAccess()
	}

	if (orm === 'atlas') {
		// TODO: 實現 Atlas 適配器
		throw new Error('❌ Atlas 適配器尚未實現')
	}

	if (orm === 'prisma') {
		// TODO: 實現 Prisma 適配器
		throw new Error('❌ Prisma 適配器尚未實現')
	}

	throw new Error(`❌ 不支援的 ORM: "${orm}"`)
}

/**
 * 使用方式摘要
 *
 * 在 Service Provider 中直接使用（無需修改）：
 *
 * ```typescript
 * export class UserServiceProvider extends ModuleServiceProvider {
 *   override register(container: IContainer): void {
 *     container.singleton('userRepository', () => {
 *       return createRepository('user', getDatabaseAccess())
 *     })
 *   }
 * }
 * ```
 *
 * 或者如果不需要 DB：
 *
 * ```typescript
 * export class UserServiceProvider extends ModuleServiceProvider {
 *   override register(container: IContainer): void {
 *     container.singleton('userRepository', () => {
 *       const orm = getCurrentORM()
 *       const db = orm !== 'memory' ? getDatabaseAccess() : undefined
 *       return createRepository('user', db)
 *     })
 *   }
 * }
 * ```
 */
