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
 * （見 start/wiring/RepositoryRegistry.ts）
 *
 * 設計優勢：
 * ✅ RepositoryFactory 保持簡潔（只有 2 個函式）
 * ✅ 各模組在 registerXRepositories.ts 中獨立定義工廠
 * ✅ 新增模組時無需修改此檔案
 * ✅ 遵循單一責任原則
 */

import { GravitoLoggerAdapter } from '@/Foundation/Infrastructure/Adapters/Gravito/GravitoLoggerAdapter'
import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'

/**
 * 系統支援的 ORM 類型定義
 */
export type ORMType = 'memory' | 'drizzle' | 'atlas' | 'prisma'

/**
 * ORM 值快取（避免重複呼叫）
 *
 * 必須快取原因：
 * 1. getCurrentORM() 在容器初始化前被調用（bootstrap 階段）
 * 2. 應用啟動時只需要一次環境變數讀取
 * 3. 避免重複驗證和日誌輸出
 *
 * 建議：在 bootstrap 後立即向容器註冊 ORM 值
 * ```typescript
 * core.container.singleton('currentORM', () => getCurrentORM())
 * ```
 */
let cachedORM: ORMType | null = null

/**
 * 從環境變數讀取並驗證當前 ORM 設定
 *
 * 這是應用的核心 ORM 選擇點，所有模組都根據此值選擇對應的 Repository 實現。
 * 第一次呼叫時讀取和驗證，後續呼叫使用快取值。
 *
 * @returns 當前選擇的 ORM 類型 ('memory', 'drizzle', 'atlas', 'prisma')
 *
 * @example
 * const orm = getCurrentORM()  // 'memory' | 'drizzle' | ... (使用快取)
 */
export function getCurrentORM(): ORMType {
	// P4 改進：快取已計算的值，避免重複的環境變數讀取和驗證
	if (cachedORM !== null) {
		return cachedORM
	}

	const logger = new GravitoLoggerAdapter()
	const orm = process.env.ORM || 'memory'
	const validORMs: ORMType[] = ['memory', 'drizzle', 'atlas', 'prisma']

	if (!validORMs.includes(orm as ORMType)) {
		logger.warn(`不支援的 ORM: "${orm}"，使用預設 "memory"`)
		cachedORM = 'memory'
		return cachedORM
	}

	logger.info(`已選擇 ORM: ${orm}`)
	cachedORM = orm as ORMType
	return cachedORM
}

/** 資料庫存取工廠：回傳 IDatabaseAccess 實例或 undefined (memory) */
type DatabaseAccessFactory = () => IDatabaseAccess | undefined

/** ORM → 資料庫存取工廠對照表 */
const databaseAccessFactories: Record<ORMType, DatabaseAccessFactory> = {
	memory: () => undefined,
	drizzle: () => {
		const { createDrizzleDatabaseAccess } = require('@/Foundation/Infrastructure/Database/Adapters/Drizzle')
		return createDrizzleDatabaseAccess()
	},
	atlas: () => {
		const { createAtlasDatabaseAccess } = require('@/Foundation/Infrastructure/Database/Adapters/Atlas')
		return createAtlasDatabaseAccess()
	},
	prisma: () => {
		throw new Error('❌ Prisma 適配器尚未實現')
	},
}

/**
 * 取得資料庫存取適配器 (Database Access Adapter)
 *
 * 根據當前選擇的 ORM 類型，透過工廠對照表建立對應的基礎設施實作。
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
export function getDatabaseAccess(): IDatabaseAccess | undefined {
	const orm = getCurrentORM()
	const factory = databaseAccessFactories[orm]
	return factory()
}

/**
 * P4 遷移後的使用模式
 *
 * 每個模組在 registerXRepositories 中直接向容器註冊 Repository：
 *
 * ```typescript
 * // app/Modules/User/Infrastructure/Providers/registerUserRepositories.ts
 * export function registerUserRepositories(
 *   db: IDatabaseAccess,
 *   eventDispatcher?: IEventDispatcher,
 *   registry?: RepositoryRegistry,
 *   container?: any
 * ): void {
 *   // 直接向容器註冊 Repository 實例
 *   container.singleton('userRepository', () => {
 *     return new UserRepository(db, eventDispatcher)
 *   })
 * }
 * ```
 *
 * 在 ServiceProvider 中直接取用：
 *
 * ```typescript
 * // app/Modules/User/Infrastructure/Providers/UserServiceProvider.ts
 * override register(container: IContainer): void {
 *   // userRepository 已由 registerUserRepositories 向容器註冊
 *   // 無需在此重複註冊
 * }
 * ```
 */
