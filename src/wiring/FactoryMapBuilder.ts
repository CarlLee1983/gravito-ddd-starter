/**
 * Factory Map Builder - 上層注入 ORM 實現的樞紐
 *
 * 職責：
 * 根據 ORM 類型和模組名稱，動態構建 Repository 工廠映射
 * 使得每個模組完全對 ORM 實現透明，所有決策由 bootstrap 層控制
 *
 * 架構特點：
 * ✅ 集中化：所有 ORM 映射邏輯在一個地方
 * ✅ 透明性：模組只知道接口，不知道實現
 * ✅ 靈活性：支援現有和未來的 ORM 適配器
 * ✅ 可測性：輕易替換模擬實現進行測試
 *
 * @example
 * // bootstrap.ts
 * const builder = new FactoryMapBuilder('drizzle')
 * registerUserRepositories(builder.build('user'))
 * registerPostRepositories(builder.build('post'))
 */

import type { RepositoryFactoryMap } from './RepositoryFactoryGenerator'
import type { ORMType } from './RepositoryFactory'

// ============================================================================
// Repository 類的導入（所有可用實現）
// ============================================================================

// Memory 實現（開發/測試）
import { UserRepository } from '@/Modules/User/Infrastructure/Persistence/UserRepository'
import { PostRepository } from '@/Modules/Post/Infrastructure/Repositories/PostRepository'

// Drizzle 實現（SQL 資料庫）
import { DrizzleUserRepository } from '@/adapters/Drizzle/Repositories/DrizzleUserRepository'
import { DrizzlePostRepository } from '@/adapters/Drizzle/Repositories/DrizzlePostRepository'

/**
 * Factory Map Builder
 *
 * 負責根據選擇的 ORM 和模組，生成相應的 Repository 工廠映射
 * 這是應用唯一知道具體 Repository 實現類的地方
 */
export class FactoryMapBuilder {
	private orm: ORMType

	/**
	 * @param orm 選擇的 ORM 類型
	 * @param db 數據庫適配器（可選，僅用於非 memory ORM）
	 */
	constructor(orm: ORMType, db?: any) {
		this.orm = orm
		// Note: db 參數會在 getModuleDefinition 中使用（通過閉包）
		// 但直接存儲 db 供工廠函數使用
		if (db) {
			// 保留 db 供內部使用（若需要）
		}
	}

	/**
	 * 為指定模組構建工廠映射
	 *
	 * 返回所有 ORM 實現的映射，但只有當前選擇的 ORM 實現會被使用
	 * 其他 ORM 實現的佔位符僅用於類型安全
	 *
	 * @param moduleName 模組名稱（'user'、'post'...）
	 * @returns Repository 工廠映射（所有 ORM 的實現）
	 *
	 * @throws 如果模組不支援或 ORM 組合不支援
	 *
	 * @example
	 * const userFactoryMap = builder.build('user')
	 * registerUserRepositories(userFactoryMap)
	 */
	build(moduleName: string): RepositoryFactoryMap {
		const definition = this.getModuleDefinition(moduleName)

		// 驗證當前選擇的 ORM 實現存在
		const currentImpl = definition[this.orm]
		if (!currentImpl) {
			throw new Error(
				`❌ 模組 "${moduleName}" 不支援 ORM "${this.orm}"。\n` +
					`已支援：${Object.keys(definition).filter((k) => definition[k]).join(', ')}`
			)
		}

		// 返回所有 ORM 實現的映射
		return {
			memory: definition.memory,
			drizzle: definition.drizzle,
			atlas: definition.atlas,
			prisma: definition.prisma,
		}
	}

	/**
	 * 取得模組的工廠映射定義
	 * 每個模組需在此定義其所有可用實現
	 *
	 * @private
	 */
	private getModuleDefinition(moduleName: string): Record<string, any> {
		const definitions: Record<string, Record<string, any>> = {
			user: {
				memory: () => new UserRepository(),
				drizzle: (db: any) => new DrizzleUserRepository(db!),
				atlas: undefined,
				prisma: undefined,
			},
			post: {
				memory: () => new PostRepository(undefined as any),
				drizzle: (db: any) => new DrizzlePostRepository(db!),
				atlas: undefined,
				prisma: undefined,
			},
			// 新增模組時，在此加入定義
			// order: {
			//   memory: () => new OrderRepository(),
			//   drizzle: (db: any) => new DrizzleOrderRepository(db!),
			// },
		}

		const definition = definitions[moduleName]

		if (!definition) {
			throw new Error(
				`❌ 模組 "${moduleName}" 未在 FactoryMapBuilder 中定義。\n` +
					`已支援的模組：${Object.keys(definitions).join(', ')}`
			)
		}

		return definition
	}

	/**
	 * 列出支援的模組
	 */
	static listSupportedModules(): string[] {
		return ['user', 'post']
	}

	/**
	 * 列出支援的 ORM
	 */
	static listSupportedORMs(): ORMType[] {
		return ['memory', 'drizzle', 'atlas', 'prisma']
	}
}

/**
 * 便利方法：快速構建特定 ORM 的 Factory Map Builder
 *
 * @example
 * const builder = createFactoryMapBuilder('drizzle', databaseAccess)
 * const userFactoryMap = builder.build('user')
 */
export function createFactoryMapBuilder(
	orm: ORMType,
	db?: any
): FactoryMapBuilder {
	return new FactoryMapBuilder(orm, db)
}
