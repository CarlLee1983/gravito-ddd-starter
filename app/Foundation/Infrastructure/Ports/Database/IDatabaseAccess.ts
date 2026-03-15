/**
 * 數據庫存取抽象（Port）
 *
 * @module IDatabaseAccess
 * @description
 * 定義與具體 ORM（如 Atlas/Drizzle）無關的查詢介面。
 * 讓各模組 Infrastructure 層可透過依賴注入替換，確保業務邏輯與實際資料庫實作解耦。
 *
 * **DDD 角色**
 * - 基礎建設：Infrastructure Port (Database)
 * - 職責：提供統一的資料存取介面，隱藏 ORM 特定細節。
 *
 * @public - 此介面是 ORM 無關的公開 API，所有層都可使用。
 * @see docs/ABSTRACTION_RULES.md - 依賴抽象化規則
 */

/**
 * 數據庫查詢建構器介面
 *
 * 提供流暢的查詢 API，隱藏具體 ORM 實現細節。
 *
 * @public
 */
export interface IQueryBuilder {
	/**
	 * WHERE 條件
	 *
	 * @param {string} column - 欄位名稱
	 * @param {string} operator - 比較運算子 ('=', '!=', '>', '<', 'LIKE' 等)
	 * @param {unknown} value - 比較值
	 * @returns {IQueryBuilder} 返回自身以支援鏈式調用
	 */
	where(column: string, operator: string, value: unknown): IQueryBuilder

	/**
	 * 取得單筆記錄
	 *
	 * @returns {Promise<Record<string, unknown> | null>} 若記錄存在則返回該記錄，否則返回 null
	 */
	first(): Promise<Record<string, unknown> | null>

	/**
	 * 取得多筆記錄
	 *
	 * @returns {Promise<Record<string, unknown>[]>} 記錄陣列
	 */
	select(): Promise<Record<string, unknown>[]>

	/**
	 * 新增記錄
	 *
	 * @param {Record<string, unknown>} data - 要新增的數據
	 * @returns {Promise<void>}
	 */
	insert(data: Record<string, unknown>): Promise<void>

	/**
	 * 更新記錄
	 *
	 * @param {Record<string, unknown>} data - 要更新的數據
	 * @returns {Promise<void>}
	 */
	update(data: Record<string, unknown>): Promise<void>

	/**
	 * 刪除記錄
	 *
	 * @returns {Promise<void>}
	 */
	delete(): Promise<void>

	/**
	 * 限制返回記錄數
	 *
	 * @param {number} n - 限制數量
	 * @returns {IQueryBuilder} 返回自身以支援鏈式調用
	 */
	limit(n: number): IQueryBuilder

	/**
	 * 分頁偏移量
	 *
	 * @param {number} n - 偏移數量
	 * @returns {IQueryBuilder} 返回自身以支援鏈式調用
	 */
	offset(n: number): IQueryBuilder

	/**
	 * 排序
	 *
	 * @param {string} column - 排序欄位
	 * @param {'ASC' | 'DESC'} direction - 排序方向
	 * @returns {IQueryBuilder} 返回自身以支援鏈式調用
	 */
	orderBy(column: string, direction: 'ASC' | 'DESC'): IQueryBuilder

	/**
	 * 範圍查詢
	 *
	 * @param {string} column - 欄位名稱
	 * @param {[Date, Date]} range - 範圍 [開始, 結束]
	 * @returns {IQueryBuilder} 返回自身以支援鏈式調用
	 */
	whereBetween(column: string, range: [Date, Date]): IQueryBuilder

	/**
	 * 計算符合條件的記錄數
	 *
	 * @returns {Promise<number>} 記錄數量
	 */
	count(): Promise<number>
}

/**
 * 數據庫存取介面
 *
 * 此介面隱藏具體 ORM 實現，提供統一的數據庫訪問入口。
 *
 * @public
 */
export interface IDatabaseAccess {
	/**
	 * 取得指定資料表的查詢建構器
	 *
	 * @param {string} name - 資料表名稱
	 * @returns {IQueryBuilder} 查詢建構器實例
	 */
	table(name: string): IQueryBuilder

	/**
	 * 在資料庫事務中執行 callback
	 * 成功自動提交；拋出異常自動回滾。
	 *
	 * @template T
	 * @param {(trx: IDatabaseAccess) => Promise<T>} callback - 事務內執行的回調函數
	 * @returns {Promise<T>} 回調函數的返回值
	 *
	 * @example
	 * ```typescript
	 * const result = await db.transaction(async (trx) => {
	 *   await trx.table('users').insert({ name: 'John' })
	 *   await trx.table('logs').insert({ action: 'user_created' })
	 *   return { success: true }
	 * })
	 * ```
	 */
	transaction<T>(callback: (trx: IDatabaseAccess) => Promise<T>): Promise<T>
}

/**
 * 向後相容：沿用既有命名時可匯入此別名
 * @deprecated 使用 IDatabaseAccess 代替
 */
export type DatabaseAccess = IDatabaseAccess
