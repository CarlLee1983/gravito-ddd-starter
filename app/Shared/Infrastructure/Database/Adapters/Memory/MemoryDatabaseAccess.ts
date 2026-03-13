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

import type { IDatabaseAccess, IQueryBuilder } from '@/Shared/Infrastructure/Ports/Database/IDatabaseAccess'

/** 內部查詢條件類型定義 */
type WhereCondition = { column: string; operator: string; value: unknown }

/**
 * 內存版查詢建構器實作
 * 模擬 SQL 的查詢語法與行為
 */
class MemoryQueryBuilder implements IQueryBuilder {
	private limitNum: number | null = null
	private offsetNum: number | null = null
	private orderByColumn: string | null = null
	private orderByDirection: 'ASC' | 'DESC' = 'ASC'
	private whereConditions: WhereCondition[] = []

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
	 * 設定排序規則
	 * @param column - 欄位名稱
	 * @param direction - 排序方向 (ASC, DESC)
	 */
	orderBy(column: string, direction: 'ASC' | 'DESC'): IQueryBuilder {
		this.orderByColumn = column
		this.orderByDirection = direction
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
		for (const cond of this.whereConditions) {
			result = result.filter((row) => this.matchRow(row, cond))
		}
		if (this.orderByColumn != null) {
			result = [...result].sort((a, b) => {
				const aVal = a[this.orderByColumn!] as string | number
				const bVal = b[this.orderByColumn!] as string | number
				const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
				return this.orderByDirection === 'DESC' ? -cmp : cmp
			})
		}
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
	 * @returns 記錄物件或 null
	 */
	async first(): Promise<Record<string, unknown> | null> {
		const rows = this.getTableRows()
		const filtered = this.filterRows(rows)
		return filtered[0] ?? null
	}

	/**
	 * 取得符合條件的所有記錄
	 * @returns 記錄物件陣列
	 */
	async select(): Promise<Record<string, unknown>[]> {
		const rows = this.getTableRows()
		return this.filterRows(rows)
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
}
