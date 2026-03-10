/**
 * Database Access Builder - 為 Repository 提供適當的 IDatabaseAccess
 *
 * 核心理念（與 FactoryMapBuilder 的根本差異）：
 * ❌ 不再：每個 ORM 對應不同的 Repository 類（UserRepository vs DrizzleUserRepository）
 * ✅ 改為：只有一個 Repository 類，根據 IDatabaseAccess 決定內存或數據庫實現
 *
 * 職責：
 * 根據 ORM 類型決定為 Repository 注入什麼 IDatabaseAccess 實現
 *
 * 架構特點：
 * ✅ 只有一個 Repository 實現（無 DrizzleUserRepository、PrismaPostRepository 等）
 * ✅ Repository 透過 IDatabaseAccess 使用 ORM，完全無感知具體 ORM
 * ✅ 所有 ORM 選擇決策在此集中，bootstrap 層控制
 * ✅ 新增 ORM 時只需在此加入新的適配器初始化
 * ✅ 完全遵循依賴注入原則
 *
 * 設計優勢：
 * - 零重複：Repository 代碼只有一份
 * - 透明性：Repository 不知道使用了什麼 ORM
 * - 靈活性：輕易切換 ORM（只改環境變數）
 * - 可測性：易於注入 mock IDatabaseAccess 進行測試
 *
 * @example
 * // bootstrap.ts - 非常簡潔！
 * const orm = getCurrentORM()
 * const builder = new DatabaseAccessBuilder(orm)
 * const db = builder.getDatabaseAccess()
 *
 * registerUserRepositories(db)
 * registerPostRepositories(db)
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { ORMType } from './RepositoryFactory'
import { getDatabaseAccess } from './RepositoryFactory'

/**
 * Database Access Builder
 *
 * 根據 ORM 類型決定為 Repository 注入什麼 IDatabaseAccess
 *
 * 設計：
 * - Memory 模式：返回 undefined（Repository 使用內存 Map）
 * - Drizzle/Prisma/Atlas：初始化並返回對應的 IDatabaseAccess 實現
 */
export class DatabaseAccessBuilder {
	private orm: ORMType
	private dbInstance: IDatabaseAccess | undefined

	/**
	 * 初始化 DatabaseAccessBuilder
	 *
	 * @param orm 選擇的 ORM 類型
	 *
	 * 行為：
	 * - 若 orm='memory'：不初始化任何數據庫（Repository 使用內存）
	 * - 若 orm='drizzle'：初始化 Drizzle DatabaseAccess
	 * - 若 orm='prisma'：初始化 Prisma DatabaseAccess
	 * - 若 orm='atlas'：初始化 Atlas DatabaseAccess
	 */
	constructor(orm: ORMType) {
		this.orm = orm

		// 只在非 memory 模式下初始化數據庫
		if (orm !== 'memory') {
			this.dbInstance = getDatabaseAccess()
		}
	}

	/**
	 * 取得應該注入給 Repository 的 IDatabaseAccess
	 *
	 * 行為：
	 * - Memory 模式：返回 undefined
	 *   → Repository 內部檢測到 undefined，使用 Map<id, entity> 進行內存存儲
	 * - 其他 ORM：返回對應的 IDatabaseAccess 實現
	 *   → Repository 內部檢測到 IDatabaseAccess 存在，使用 db.table().where()... 進行查詢
	 *
	 * 這樣 Repository 可以自動適應兩種模式，無需重複代碼！
	 *
	 * @returns IDatabaseAccess | undefined
	 *
	 * @example
	 * // 開發環境：使用內存
	 * const builder = new DatabaseAccessBuilder('memory')
	 * const db = builder.getDatabaseAccess()  // undefined
	 * const userRepo = new UserRepository(db)  // 使用內存實現
	 *
	 * // 生產環境：使用 Drizzle
	 * const builder = new DatabaseAccessBuilder('drizzle')
	 * const db = builder.getDatabaseAccess()  // DrizzleDatabaseAccess 實例
	 * const userRepo = new UserRepository(db)  // 使用數據庫實現
	 */
	getDatabaseAccess(): IDatabaseAccess | undefined {
		return this.dbInstance
	}

	/**
	 * 取得當前選擇的 ORM 類型
	 */
	getORM(): ORMType {
		return this.orm
	}

	/**
	 * 列出支援的 ORM
	 */
	static listSupportedORMs(): ORMType[] {
		return ['memory', 'drizzle', 'atlas', 'prisma']
	}
}

/**
 * 便利方法：快速構建 DatabaseAccessBuilder 並取得 IDatabaseAccess
 *
 * @example
 * const db = createDatabaseAccess('drizzle')
 * registerUserRepositories(db)
 */
export function createDatabaseAccess(orm: ORMType): IDatabaseAccess | undefined {
	return new DatabaseAccessBuilder(orm).getDatabaseAccess()
}
