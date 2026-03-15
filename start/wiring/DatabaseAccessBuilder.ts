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
 * P5 簡化：純粹的工廠類，用於建立 IDatabaseAccess 實例。
 * - 由 bootstrap 調用，在容器初始化時建立 DB 實例
 * - 結果向容器註冊為 'databaseAccess' 單例
 * - 不再需要其他方法（getORM 等已廢棄）
 */
export class DatabaseAccessBuilder {
	private dbInstance: IDatabaseAccess

	/**
	 * 初始化 DatabaseAccessBuilder
	 *
	 * @param orm - 由 getCurrentORM() 確定的 ORM 類型
	 */
	constructor(orm: ORMType) {
		this.dbInstance =
			orm === 'memory' ? new MemoryDatabaseAccess() : (getDatabaseAccess() as IDatabaseAccess)
	}

	/**
	 * 取得已建立的 IDatabaseAccess 實例
	 *
	 * @returns 用於所有 Repository 的資料庫存取適配器
	 */
	getDatabaseAccess(): IDatabaseAccess {
		return this.dbInstance
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
