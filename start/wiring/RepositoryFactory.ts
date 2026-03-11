/**
 * @file RepositoryFactory.ts
 * @description Repository 工廠工具集 - 提供 ORM 選擇與資料庫存取初始化
 *
 * 在 DDD 架構中的角色：
 * - 接線層 (Wiring Layer)：負責基礎設施的環境自適應配置。
 * - 職責：讀取環境配置以決定全域 ORM 策略，並負責建立對應的資料庫存取實例。
 *
 * 核心函式：
 * 1. getCurrentORM() - 讀取環境變數決定 ORM
 * 2. getDatabaseAccess() - 初始化 Database 適配器
 *
 * Repository 建立邏輯完全委托給 RepositoryRegistry
 * （見 src/wiring/RepositoryRegistry.ts）
 *
 * 設計優勢：
 * ✅ RepositoryFactory 保持簡潔（只有 2 個函式）
 * ✅ 各模組在 registerXRepositories.ts 中獨立定義工廠
 * ✅ 新增模組時無需修改此檔案
 * ✅ 遵循單一責任原則
 */

/**
 * 系統支援的 ORM 類型定義
 */
export type ORMType = 'memory' | 'drizzle' | 'atlas' | 'prisma'

/**
 * 從環境變數讀取並驗證當前 ORM 設定
 *
 * 這是應用的核心 ORM 選擇點，所有模組都根據此值選擇對應的 Repository 實現。
 *
 * @returns 當前選擇的 ORM 類型 ('memory', 'drizzle', 'atlas', 'prisma')
 *
 * @example
 * const orm = getCurrentORM()  // 'memory' | 'drizzle' | ...
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
 * 取得資料庫存取適配器 (Database Access Adapter)
 *
 * 根據當前選擇的 ORM 類型，動態載入並初始化對應的基礎設施實作。
 *
 * 設計：
 * - ORM=memory → 返回 undefined（由 DatabaseAccessBuilder 處理內存實作）
 * - ORM=drizzle → 返回 DrizzleDatabaseAccess
 * - ORM=atlas → 返回 AtlasDatabaseAccess
 *
 * @returns IDatabaseAccess 實作實例或 undefined (當使用 memory 模式時)
 * @throws 當指定的 ORM 尚未實作適配器時拋出錯誤
 *
 * @example
 * const db = getDatabaseAccess()
 */
export function getDatabaseAccess() {
	const orm = getCurrentORM()

	if (orm === 'memory') {
		return undefined
	}

	if (orm === 'drizzle') {
		const { createDrizzleDatabaseAccess } = require('@/Shared/Infrastructure/Database/Adapters/Drizzle')
		return createDrizzleDatabaseAccess()
	}

	if (orm === 'atlas') {
		const { createAtlasDatabaseAccess } = require('@/Shared/Infrastructure/Database/Adapters/Atlas')
		return createAtlasDatabaseAccess()
	}

	if (orm === 'prisma') {
		// TODO: 實現 Prisma 適配器
		throw new Error('❌ Prisma 適配器尚未實現')
	}

	throw new Error(`❌ 不支援的 ORM: "${orm}"`)
}

/**
 * 使用模式
 *
 * 每個模組在自己的 registerXRepositories.ts 中定義工廠：
 *
 * ```typescript
 * // src/Modules/User/Infrastructure/Providers/registerUserRepositories.ts
 * import { getCurrentORM, getDatabaseAccess } from '@/wiring/RepositoryFactory'
 * import { getRegistry } from '@/wiring/RepositoryRegistry'
 *
 * function createUserRepository(orm: string, db?: IDatabaseAccess): any {
 *   switch (orm) {
 *     case 'memory':
 *       return new UserRepository()
 *     case 'drizzle':
 *       return new DrizzleUserRepository(db!)
 *     // ...
 *   }
 * }
 *
 * export function registerUserRepositories(): void {
 *   getRegistry().register('user', createUserRepository)
 * }
 * ```
 *
 * 在 ServiceProvider 中使用 Registry：
 *
 * ```typescript
 * // src/Modules/User/Infrastructure/Providers/UserServiceProvider.ts
 * override register(container: IContainer): void {
 *   container.singleton('userRepository', () => {
 *     const registry = getRegistry()
 *     const orm = getCurrentORM()
 *     const db = orm !== 'memory' ? getDatabaseAccess() : undefined
 *     return registry.create('user', orm, db)
 *   })
 * }
 * ```
 */
