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
 * WHERE 比較運算子類型
 *
 * @public
 */
export type WhereOperator = '=' | '!=' | '<>' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'like' | 'IN' | 'in'

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
	 * @param {WhereOperator} operator - 比較運算子 ('=', '!=', '>', '<', 'LIKE' 等)
	 * @param {unknown} value - 比較值
	 * @returns {IQueryBuilder} 返回自身以支援鏈式調用
	 */
	where(column: string, operator: WhereOperator, value: unknown): IQueryBuilder

	/**
	 * 取得單筆記錄
	 *
	 * @param {string[]} [columns] - 要選取的欄位名稱（可選，預設選取所有欄位）
	 * @returns {Promise<Record<string, unknown> | null>} 若記錄存在則返回該記錄，否則返回 null
	 */
	first(columns?: string[]): Promise<Record<string, unknown> | null>

	/**
	 * 取得多筆記錄
	 *
	 * @param {string[]} [columns] - 要選取的欄位名稱（可選，預設選取所有欄位）
	 * @returns {Promise<Record<string, unknown>[]>} 記錄陣列
	 */
	select(columns?: string[]): Promise<Record<string, unknown>[]>

	/**
	 * 取得去重後的多筆記錄
	 *
	 * @param {string[]} [columns] - 要選取的欄位名稱（可選，預設選取所有欄位）
	 * @returns {Promise<Record<string, unknown>[]>} 去重後的記錄陣列
	 *
	 * @example
	 * ```typescript
	 * // 取得不重複的狀態值
	 * const statuses = await db.table('orders')
	 *   .distinct(['status'])
	 *   .select()
	 * ```
	 */
	distinct(columns?: string[]): Promise<Record<string, unknown>[]>

	/**
	 * 新增單筆記錄
	 *
	 * @param {Record<string, unknown>} data - 要新增的數據
	 * @returns {Promise<void>}
	 */
	insert(data: Record<string, unknown>): Promise<void>

	/**
	 * 批量新增多筆記錄
	 *
	 * @param {Record<string, unknown>[]} data - 要新增的數據陣列
	 * @returns {Promise<void>}
	 */
	insertMany(data: Record<string, unknown>[]): Promise<void>

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
	 * 支援多次呼叫進行多欄位排序。
	 * 呼叫順序決定排序優先級（第一次呼叫為優先度最高）。
	 *
	 * @param {string} column - 排序欄位
	 * @param {'ASC' | 'DESC'} direction - 排序方向（預設為 'ASC'）
	 * @returns {IQueryBuilder} 返回自身以支援鏈式調用
	 *
	 * @example
	 * ```typescript
	 * // 多欄位排序：先按 status，再按 created_at
	 * await db.table('orders')
	 *   .orderBy('status', 'ASC')
	 *   .orderBy('created_at', 'DESC')
	 *   .select()
	 * ```
	 */
	orderBy(column: string, direction?: 'ASC' | 'DESC'): IQueryBuilder

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

	/**
	 * IN 查詢
	 *
	 * @param {string} column - 欄位名稱
	 * @param {unknown[]} values - 值陣列
	 * @returns {IQueryBuilder} 返回自身以支援鏈式調用
	 */
	whereIn(column: string, values: unknown[]): IQueryBuilder

	/**
	 * OR 條件
	 *
	 * @param {string} column - 欄位名稱
	 * @param {WhereOperator} operator - 比較運算子
	 * @param {unknown} value - 比較值
	 * @returns {IQueryBuilder} 返回自身以支援鏈式調用
	 */
	orWhere(column: string, operator: WhereOperator, value: unknown): IQueryBuilder

	/**
	 * INNER JOIN
	 *
	 * @param {string} table - 要 JOIN 的資料表名稱
	 * @param {string} localColumn - 本表欄位名稱
	 * @param {string} foreignColumn - 外表欄位名稱
	 * @returns {IQueryBuilder} 返回自身以支援鏈式調用
	 */
	join(table: string, localColumn: string, foreignColumn: string): IQueryBuilder

	/**
	 * LEFT JOIN
	 *
	 * @param {string} table - 要 JOIN 的資料表名稱
	 * @param {string} localColumn - 本表欄位名稱
	 * @param {string} foreignColumn - 外表欄位名稱
	 * @returns {IQueryBuilder} 返回自身以支援鏈式調用
	 */
	leftJoin(table: string, localColumn: string, foreignColumn: string): IQueryBuilder

	/**
	 * GROUP BY
	 *
	 * @param {...string[]} columns - 要分組的欄位名稱（可變參數）
	 * @returns {IQueryBuilder} 返回自身以支援鏈式調用
	 */
	groupBy(...columns: string[]): IQueryBuilder

	/**
	 * GROUP BY 後的條件篩選（HAVING 子句）
	 *
	 * @param {string} column - 聚合欄位名稱
	 * @param {WhereOperator} operator - 比較運算子
	 * @param {unknown} value - 比較值
	 * @returns {IQueryBuilder} 返回自身以支援鏈式調用
	 *
	 * @example
	 * ```typescript
	 * // 取得訂單數量 > 5 的使用者
	 * await db.table('orders')
	 *   .groupBy('user_id')
	 *   .having('count', '>', 5)
	 *   .select()
	 * ```
	 */
	having(column: string, operator: WhereOperator, value: unknown): IQueryBuilder

	/**
	 * 檢查欄位為 NULL
	 *
	 * @param {string} column - 欄位名稱
	 * @returns {IQueryBuilder} 返回自身以支援鏈式調用
	 */
	whereNull(column: string): IQueryBuilder

	/**
	 * 檢查欄位不為 NULL
	 *
	 * @param {string} column - 欄位名稱
	 * @returns {IQueryBuilder} 返回自身以支援鏈式調用
	 */
	whereNotNull(column: string): IQueryBuilder
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

	/**
	 * 執行原始 SQL 查詢（逃生口）
	 *
	 * 用於執行 IQueryBuilder 無法表達的複雜查詢。
	 * 實現應使用參數化查詢防止 SQL 注入。
	 *
	 * @param {string} sql - SQL 查詢語句
	 * @param {unknown[]} [params] - 查詢參數（可選）
	 * @returns {Promise<Record<string, unknown>[]>} 查詢結果陣列
	 *
	 * @example
	 * ```typescript
	 * const results = await db.raw(
	 *   'SELECT * FROM users WHERE age > ? AND status = ?',
	 *   [18, 'active']
	 * )
	 * ```
	 */
	raw(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]>
}

/**
 * 向後相容：沿用既有命名時可匯入此別名
 * @deprecated 使用 IDatabaseAccess 代替
 */
export type DatabaseAccess = IDatabaseAccess
