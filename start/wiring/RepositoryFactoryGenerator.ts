/**
 * @file RepositoryFactoryGenerator.ts
 * @description Repository 工廠生成器 - 消除重複的工廠建構邏輯
 *
 * 在 DDD 架構中的角色：
 * - 接線層 (Wiring Layer)：提供通用的工具函數，用於標準化各模組的倉儲建立流程。
 * - 職責：消除各模組中重複的 ORM 選擇 switch/case 代碼，實現配置驅動的工廠註冊。
 *
 * 解決方案：
 * 使用 createRepositoryFactory 生成器，傳入 Repository 類的映射。
 *
 * 優勢：
 * ✅ 消除所有重複代碼
 * ✅ 簡潔清晰
 * ✅ 類型安全
 * ✅ 易於擴展（新增 ORM 時只改映射）
 */

import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'

/**
 * Repository 工廠映射類型定義
 * 為每個支援的 ORM 提供一個建立實例的工廠函數
 *
 * @example
 * {
 *   memory: () => new UserRepository(),
 *   drizzle: (db) => new DrizzleUserRepository(db!),
 *   atlas: (db) => new AtlasUserRepository(db!),
 * }
 */
export type RepositoryFactoryMap = {
	/** 記憶體模式下的工廠 */
	memory?: () => any
	/** Drizzle ORM 下的工廠 */
	drizzle?: (db: IDatabaseAccess) => any
	/** Atlas ORM 下 the 工廠 */
	atlas?: (db: IDatabaseAccess) => any
	/** Prisma ORM 下 the 工廠 */
	prisma?: (db: IDatabaseAccess) => any
}

/**
 * 生成通用的 Repository 工廠函數
 *
 * 使用配置驅動的方式生成符合 RepositoryFactory 介面的函數，減少重複代碼。
 *
 * @param factoryMap - 定義了不同 ORM 建立邏輯的映射物件
 * @returns 符合標準工廠介面的函數
 *
 * @example
 * const userFactory = createRepositoryFactory({
 *   memory: () => new UserRepository(),
 *   drizzle: (db) => new DrizzleUserRepository(db!),
 * })
 *
 * registry.register('user', userFactory)
 */
export function createRepositoryFactory(factoryMap: RepositoryFactoryMap) {
	return (orm: string, db: IDatabaseAccess | undefined): any => {
		// 根據 ORM 類型選擇對應的工廠函數
		const factory = factoryMap[orm as keyof RepositoryFactoryMap]

		if (!factory) {
			throw new Error(
				`❌ Repository 不支援 ORM "${orm}"。\n` +
					`已支援：${Object.keys(factoryMap).join(', ')}`
			)
		}

		// 調用工廠函數
		// memory 不需要 db，其他 ORM 必須提供 db 實例
		if (orm === 'memory') {
			return (factory as () => any)()
		} else {
			if (!db) {
				throw new Error(
					`❌ ORM="${orm}" 需要 DatabaseAccess，但未提供`
				)
			}
			return (factory as (db: IDatabaseAccess) => any)(db)
		}
	}
}
