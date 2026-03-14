/**
 * @file DatabaseAccessBuilder.ts
 * @description Database Access Builder - 為倉儲提供適用的資料庫存取實作
 *
 * 在 DDD 架構中的角色：
 * - 接線層 (Wiring Layer)：負責基礎設施組件的組裝與配置。
 * - 職責：根據當前環境選擇的 ORM 類型，為 Repository 注入正確的 IDatabaseAccess 實現（如 Memory、Drizzle 等）。
 *
 * 核心理念：
 * ✅ 倉儲層只有一個 Repository 類，根據注入的 IDatabaseAccess 決定內存或數據庫行為。
 * ✅ Repository 透過介面與 ORM 溝通，完全無感知底層具體技術。
 * ✅ 所有技術決策集中在接線層，符合依賴倒置原則。
 *
 * 設計優勢：
 * - 零重複：倉儲代碼只有一份。
 * - 透明性：業務邏輯與數據庫技術解耦。
 * - 靈活性：環境變數即可切換全域持久化方案。
 */

import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import { MemoryDatabaseAccess } from '@/Foundation/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import type { ORMType } from './RepositoryFactory'
import { getDatabaseAccess } from './RepositoryFactory'

/**
 * Database Access Builder 類別
 *
 * 封裝了 IDatabaseAccess 的建立邏輯。
 */
export class DatabaseAccessBuilder {
	/** 當前配置的 ORM 類型 */
	private orm: ORMType
	/** 已建立的資料庫存取實例 */
	private dbInstance: IDatabaseAccess

	/**
	 * 初始化 DatabaseAccessBuilder
	 *
	 * @param orm - 選擇的 ORM 類型 (如 'memory', 'drizzle' 等)
	 *
	 * 行為：
	 * - 若 orm='memory'：建立 MemoryDatabaseAccess 實例。
	 * - 若為其他類型：透過工廠獲取對應的資料庫適配器。
	 */
	constructor(orm: ORMType) {
		this.orm = orm
		this.dbInstance =
			orm === 'memory' ? new MemoryDatabaseAccess() : (getDatabaseAccess() as IDatabaseAccess)
	}

	/**
	 * 取得應該注入給各個模組 Repository 的 IDatabaseAccess 實例
	 *
	 * @returns 已初始化的 IDatabaseAccess 實作 (必不為空)
	 */
	getDatabaseAccess(): IDatabaseAccess {
		return this.dbInstance
	}

	/**
	 * 取得當前使用的 ORM 類型名稱
	 *
	 * @returns ORM 類型字串
	 */
	getORM(): ORMType {
		return this.orm
	}

	/**
	 * 取得系統目前支援的所有 ORM 類型列表
	 *
	 * @returns 支援的 ORM 類型陣列
	 */
	static listSupportedORMs(): ORMType[] {
		return ['memory', 'drizzle', 'atlas', 'prisma']
	}
}

/**
 * 便利工廠函數：快速建立資料庫存取適配器
 *
 * @param orm - 指定的 ORM 類型
 * @returns 回傳符合 IDatabaseAccess 介面的實作實例
 *
 * @example
 * const db = createDatabaseAccess('drizzle')
 * registerUserRepositories(db)
 */
export function createDatabaseAccess(orm: ORMType): IDatabaseAccess {
	return new DatabaseAccessBuilder(orm).getDatabaseAccess()
}
