/**
 * @file MemoryDatabaseAccess.ts
 * @description 內存版資料庫存取實現 (In-Memory Database Access)
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：提供持久化介面的內存實現適配器。
 * - 職責：模擬真實資料庫的操作，用於開發環境或單元測試，使系統能在不依賴外部資料庫的情況下運作。
 *
 * 設計理念：
 * 當上層未提供真實資料庫（orm='memory'）時，由 DatabaseAccessBuilder 注入此實現，
 * Repository 僅依賴 IDatabaseAccess 介面，無需在底層做 if (db) 分支。
 *
 * @internal - 基礎設施預設實現，由接線層決定是否使用
 */

import type { IDatabaseAccess, IQueryBuilder } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'

/** 內部查詢條件類型定義 */
type WhereCondition = { column: string; operator: string; value: unknown }

/**
 * 內存版查詢建構器實作
 * 模擬 SQL 的查詢語法與行為
 */
class MemoryQueryBuilder implements IQueryBuilder {
	private limitNum: number | null = null
	private offsetNum: number | null = null
	private orderByRules: Array<{ column: string; direction: 'ASC' | 'DESC' }> = []
	private whereConditions: WhereCondition[] = []
	private orConditions: WhereCondition[] = []
	private joinClauses: Array<{ table: string; localColumn: string; foreignColumn: string; type: 'INNER' | 'LEFT' }> = []
	private groupByColumns: string[] = []
	private isDistinct: boolean = false
	private distinctColumns: string[] = []
	private havingConditions: Array<{ column: string; operator: string; value: unknown }> = []

	/**
	 * 建構子
	 * @param tableName - 目標資料表名稱
	 * @param store - 共享的內存資料存儲引用
	 */
	constructor(
		private tableName: string,
		private store: Map<string, Record<string, unknown>[]>,
	) {}

	/**
	 * 加入查詢條件
	 * @param column - 欄位名稱
	 * @param operator - 運算子 (=, !=, >, <, LIKE 等)
	 * @param value - 比較值
	 */
	where(column: string, operator: string, value: unknown): IQueryBuilder {
		this.whereConditions.push({ column, operator, value })
		return this
	}

	/**
	 * 設定限制回傳筆數
	 * @param n - 筆數
	 */
	limit(n: number): IQueryBuilder {
		this.limitNum = n
		return this
	}

	/**
	 * 設定位移量
	 * @param n - 位移數量
	 */
	offset(n: number): IQueryBuilder {
		this.offsetNum = n
		return this
	}

	/**
	 * 設定排序規則（支援多欄位）
	 * @param column - 欄位名稱
	 * @param direction - 排序方向 (ASC, DESC，預設 ASC)
	 */
	orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): IQueryBuilder {
		this.orderByRules.push({ column, direction })
		return this
	}

	/**
	 * 加入範圍查詢條件 (時間範圍)
	 * @param column - 欄位名稱
	 * @param range - [開始時間, 結束時間]
	 */
	whereBetween(column: string, range: [Date, Date]): IQueryBuilder {
		this.whereConditions.push({ column, operator: '>=', value: range[0] })
		this.whereConditions.push({ column, operator: '<=', value: range[1] })
		return this
	}

	/**
	 * IN 查詢
	 * @param column - 欄位名稱
	 * @param values - 值陣列
	 */
	whereIn(column: string, values: unknown[]): IQueryBuilder {
		this.whereConditions.push({ column, operator: 'IN', value: values })
		return this
	}

	/**
	 * OR 條件
	 * @param column - 欄位名稱
	 * @param operator - 運算子
	 * @param value - 比較值
	 */
	orWhere(column: string, operator: string, value: unknown): IQueryBuilder {
		this.orConditions.push({ column, operator, value })
		return this
	}

	/**
	 * INNER JOIN
	 * @param table - 要 JOIN 的資料表名稱
	 * @param localColumn - 本表欄位名稱
	 * @param foreignColumn - 外表欄位名稱
	 */
	join(table: string, localColumn: string, foreignColumn: string): IQueryBuilder {
		this.joinClauses.push({ table, localColumn, foreignColumn, type: 'INNER' })
		return this
	}

	/**
	 * LEFT JOIN
	 * @param table - 要 JOIN 的資料表名稱
	 * @param localColumn - 本表欄位名稱
	 * @param foreignColumn - 外表欄位名稱
	 */
	leftJoin(table: string, localColumn: string, foreignColumn: string): IQueryBuilder {
		this.joinClauses.push({ table, localColumn, foreignColumn, type: 'LEFT' })
		return this
	}

	/**
	 * GROUP BY
	 * @param columns - 要分組的欄位名稱
	 */
	groupBy(...columns: string[]): IQueryBuilder {
		this.groupByColumns.push(...columns)
		return this
	}

	/**
	 * 檢查欄位為 NULL
	 * @param column - 欄位名稱
	 */
	whereNull(column: string): IQueryBuilder {
		this.whereConditions.push({ column, operator: 'IS_NULL', value: null })
		return this
	}

	/**
	 * 檢查欄位不為 NULL
	 * @param column - 欄位名稱
	 */
	whereNotNull(column: string): IQueryBuilder {
		this.whereConditions.push({ column, operator: 'IS_NOT_NULL', value: null })
		return this
	}

	/**
	 * 取得去重後的多筆記錄
	 * @param columns - 要選取的欄位名稱
	 */
	async distinct(columns?: string[]): Promise<Record<string, unknown>[]> {
		this.isDistinct = true
		if (columns) {
			this.distinctColumns = columns
		}
		const result = await this.select(columns)
		return result
	}

	/**
	 * GROUP BY 後的條件篩選 (HAVING)
	 * @param column - 聚合欄位名稱
	 * @param operator - 比較運算子
	 * @param value - 比較值
	 */
	having(column: string, operator: string, value: unknown): IQueryBuilder {
		this.havingConditions.push({ column, operator, value })
		return this
	}

	/**
	 * 取得指定表格的所有原始資料行
	 * @private
	 */
	private getTableRows(): Record<string, unknown>[] {
		if (!this.store.has(this.tableName)) {
			this.store.set(this.tableName, [])
		}
		return this.store.get(this.tableName)!
	}

	/**
	 * 檢查單一資料行是否符合指定條件
	 * @private
	 */
	private matchRow(row: Record<string, unknown>, cond: WhereCondition): boolean {
		const val = row[cond.column]
		if (val === undefined && !(cond.column in row)) return false
		switch (cond.operator) {
			case '=':
				return val === cond.value
			case '!=':
			case '<>':
				return val !== cond.value
			case '>':
				return Number(val) > Number(cond.value) || (val as string) > (cond.value as string)
			case '>=':
				return Number(val) >= Number(cond.value) || (val as string) >= (cond.value as string)
			case '<':
				return Number(val) < Number(cond.value) || (val as string) < (cond.value as string)
			case '<=':
				return Number(val) <= Number(cond.value) || (val as string) <= (cond.value as string)
			case 'LIKE':
				return String(val).includes(String(cond.value).replace(/%/g, ''))
			case 'IN':
				return (cond.value as unknown[]).includes(val)
			case 'between':
				const [start, end] = cond.value as [Date, Date]
				return val >= start && val <= end
			case 'IS_NULL':
				return val === null || val === undefined
			case 'IS_NOT_NULL':
				return val !== null && val !== undefined
			default:
				return false
		}
	}

	/**
	 * 執行過濾、排序與分頁邏輯
	 * @private
	 */
	private filterRows(rows: Record<string, unknown>[], options?: { skipLimitOffset?: boolean }): Record<string, unknown>[] {
		let result = rows

		// 複合過濾：(AND 條件) OR (OR 條件)
		// 邏輯：所有 WHERE 條件都滿足 OR 至少一個 OR 條件滿足
		result = result.filter((row) => {
			// 檢查所有 AND 條件是否都滿足
			const allAndConditionsMet = this.whereConditions.every((cond) => this.matchRow(row, cond))

			// 檢查是否有 OR 條件滿足
			const anyOrConditionMet = this.orConditions.length > 0 && this.orConditions.some((cond) => this.matchRow(row, cond))

			// 若無 OR 條件，只需檢查 AND 條件
			// 若有 OR 條件，則 (AND 都滿足) OR (至少一個 OR 滿足)
			return this.orConditions.length === 0 ? allAndConditionsMet : allAndConditionsMet || anyOrConditionMet
		})

		// 處理 JOIN（基礎實現）
		// 注意：記憶體版本的 JOIN 只是單純的資料關聯標記，不做實際的關聯查詢
		// 實際的 JOIN 邏輯應在 Atlas/Drizzle 適配器中實現
		if (this.joinClauses.length > 0) {
			// 記憶體版本 JOIN 實現複雜度高，暫時保留結果
			// 實際使用應使用 Atlas 或 Drizzle 適配器
		}

		// 排序（支援多欄位）
		if (this.orderByRules.length > 0) {
			result = [...result].sort((a, b) => {
				for (const rule of this.orderByRules) {
					const aVal = a[rule.column] as string | number
					const bVal = b[rule.column] as string | number
					const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
					if (cmp !== 0) {
						return rule.direction === 'DESC' ? -cmp : cmp
					}
				}
				return 0
			})
		}

		// GROUP BY（基礎實現：根據指定欄位分組）
		if (this.groupByColumns.length > 0) {
			const grouped = new Map<string, Record<string, unknown>[]>()
			for (const row of result) {
				const key = this.groupByColumns.map((col) => row[col]).join('|')
				if (!grouped.has(key)) {
					grouped.set(key, [])
				}
				grouped.get(key)!.push(row)
			}
			// 返回每組的第一筆記錄（代表該組）
			result = Array.from(grouped.values()).map((group) => group[0])
		}

		// 分頁
		if (!options?.skipLimitOffset) {
			if (this.offsetNum != null) {
				result = result.slice(this.offsetNum)
			}
			if (this.limitNum != null) {
				result = result.slice(0, this.limitNum)
			}
		}

		return result
	}

	/**
	 * 取得符合條件的第一筆記錄
	 * @param columns - 要選取的欄位名稱（可選）
	 * @returns 記錄物件或 null
	 */
	async first(columns?: string[]): Promise<Record<string, unknown> | null> {
		const rows = this.getTableRows()
		const filtered = this.filterRows(rows)
		const row = filtered[0] ?? null
		if (!row || !columns || columns.length === 0) return row
		
		const result: Record<string, unknown> = {}
		for (const col of columns) {
			if (col in row) {
				result[col] = row[col]
			}
		}
		return result
	}

	/**
	 * 取得符合條件的所有記錄
	 * @param columns - 要選取的欄位名稱（可選）
	 * @returns 記錄物件陣列
	 */
	async select(columns?: string[]): Promise<Record<string, unknown>[]> {
		const rows = this.getTableRows()
		let filtered = this.filterRows(rows)

		if (!columns || columns.length === 0) {
			columns = columns || (filtered.length > 0 ? Object.keys(filtered[0]) : [])
		}

		const result = filtered.map(row => {
			const rowResult: Record<string, unknown> = {}
			for (const col of columns!) {
				if (col in row) {
					rowResult[col] = row[col]
				}
			}
			return rowResult
		})

		// 應用 DISTINCT
		if (this.isDistinct) {
			const seen = new Set<string>()
			const distinctResult: Record<string, unknown>[] = []
			for (const row of result) {
				const key = JSON.stringify(row)
				if (!seen.has(key)) {
					seen.add(key)
					distinctResult.push(row)
				}
			}
			return distinctResult
		}

		return result
	}

	/**
	 * 新增一筆記錄
	 * @param data - 資料物件
	 */
	async insert(data: Record<string, unknown>): Promise<void> {
		const rows = this.getTableRows()
		rows.push({ ...data })
	}

	/**
	 * 批量新增多筆記錄
	 * @param data - 資料物件陣列
	 */
	async insertMany(data: Record<string, unknown>[]): Promise<void> {
		const rows = this.getTableRows()
		for (const item of data) {
			rows.push({ ...item })
		}
	}

	/**
	 * 更新符合條件的記錄
	 * @param data - 要更新的欄位與數值
	 */
	async update(data: Record<string, unknown>): Promise<void> {
		const rows = this.getTableRows()
		const filtered = this.filterRows(rows)
		const set = new Set(filtered)
		for (let i = 0; i < rows.length; i++) {
			if (set.has(rows[i])) {
				rows[i] = { ...rows[i], ...data }
			}
		}
	}

	/**
	 * 刪除符合條件的記錄
	 */
	async delete(): Promise<void> {
		const rows = this.getTableRows()
		const filtered = this.filterRows(rows)
		const set = new Set(filtered)
		for (let i = rows.length - 1; i >= 0; i--) {
			if (set.has(rows[i])) {
				rows.splice(i, 1)
			}
		}
	}

	/**
	 * 新增或更新記錄（UPSERT）
	 * @param data - 要新增或更新的數據
	 * @param uniqueFields - 唯一欄位名稱
	 * @returns 新增或更新後的記錄
	 */
	async upsert(data: Record<string, unknown>, uniqueFields: string[]): Promise<Record<string, unknown>> {
		const rows = this.getTableRows()

		// 查找是否存在相同的唯一欄位值
		const existingIndex = rows.findIndex((row) => {
			return uniqueFields.every((field) => row[field] === data[field])
		})

		if (existingIndex >= 0) {
			// 存在則更新
			const updated = { ...rows[existingIndex], ...data }
			rows[existingIndex] = updated
			return updated
		} else {
			// 不存在則新增
			rows.push(data)
			return data
		}
	}

	/**
	 * 計算符合條件的記錄總數
	 * @returns 總數
	 */
	async count(): Promise<number> {
		const rows = this.getTableRows()
		const filtered = this.filterRows(rows, { skipLimitOffset: true })
		return filtered.length
	}
}

/**
 * 內存版 IDatabaseAccess 實作類別
 * 提供基礎設施層的內存持久化模擬功能。
 */
export class MemoryDatabaseAccess implements IDatabaseAccess {
	/** 儲存所有資料表的 Map，鍵為表名，值為資料行陣列 */
	private store = new Map<string, Record<string, unknown>[]>()

	/**
	 * 選擇要操作的資料表
	 * @param name - 資料表名稱
	 * @returns 查詢建構器實例
	 */
	table(name: string): IQueryBuilder {
		return new MemoryQueryBuilder(name, this.store)
	}

	/**
	 * 在資料庫事務中執行 callback
	 * 支援回滾：失敗時還原所有修改
	 * @param callback - 事務回調函數
	 * @returns 回調的返回值
	 */
	async transaction<T>(callback: (trx: IDatabaseAccess) => Promise<T>): Promise<T> {
		// 保存快照：複製所有表格的當前狀態
		const snapshot = new Map(
			Array.from(this.store.entries()).map(([tableName, rows]) => [
				tableName,
				[...rows], // 淺層複製陣列
			])
		)

		try {
			// 在事務內執行回調，傳入自身作為事務存取介面
			return await callback(this)
		} catch (error) {
			// 失敗：還原所有修改
			this.store.clear()
			for (const [tableName, rows] of snapshot) {
				this.store.set(tableName, [...rows])
			}
			throw error
		}
	}

	/**
	 * 執行原始 SQL 查詢（內存版本不支援）
	 * @param sql - SQL 查詢語句
	 * @throws 拋出不支援的操作錯誤
	 */
	async raw(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]> {
		throw new Error(
			'MemoryDatabaseAccess does not support raw SQL queries. Use table() method instead.'
		)
	}
}
