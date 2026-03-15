/**
 * @file AtlasQueryBuilder.ts
 * @description Atlas 查詢建構器實作
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：實作 IQueryBuilder 介面，將 Gravito Atlas ORM 的 API 適配為系統統一的查詢介面。
 * - 職責：隱藏所有 Atlas 特定的查詢細節，確保領域與應用層不直接依賴於特定的 ORM 語法。
 *
 * @internal 此實現是基礎設施層細節
 */

import type { IQueryBuilder } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import * as Atlas from '@gravito/atlas'

/**
 * 懶加載 Atlas DB 實例
 * @internal
 * @returns Gravito Atlas DB 實例
 */
function getDB(): any {
	return (Atlas as any).DB
}

/**
 * Atlas 查詢建構器實作類別
 *
 * 將 Atlas 的流式查詢 API 轉換為標準的 IQueryBuilder 契約。
 */
export class AtlasQueryBuilder implements IQueryBuilder {
	/** 儲存累積的查詢條件 */
	private whereConditions: Array<{ column: string; operator: string; value: unknown }> = []
	/** 儲存 OR 條件 */
	private orConditions: Array<{ column: string; operator: string; value: unknown }> = []
	/** 排序配置 */
	private orderByConfig: { column: string; direction: 'ASC' | 'DESC' } | null = null
	/** 限制筆數 */
	private limitValue: number | null = null
	/** 位移筆數 */
	private offsetValue: number | null = null
	/** JOIN 子句 */
	private joinClauses: Array<{ table: string; localColumn: string; foreignColumn: string; type: 'INNER' | 'LEFT' }> = []
	/** GROUP BY 欄位 */
	private groupByColumns: string[] = []

	/**
	 * 建構子
	 * @param tableName - 目標資料表名稱
	 * @param trxClient - 事務客戶端（可選，用於事務上下文）
	 * @param logger - 日誌服務（可選）
	 */
	constructor(
		private tableName: string,
		private trxClient?: any,
		private logger?: ILogger
	) {}

	/**
	 * 取得適當的資料庫實例（事務或全局）
	 * @private
	 */
	private getQueryDB(): any {
		return this.trxClient || getDB()
	}

	/**
	 * 添加 WHERE 查詢條件
	 *
	 * @param column - 欄位名稱
	 * @param operator - 比較運算子（如 =, !=, >, <, >=, <=, like, in）
	 * @param value - 比較數值
	 * @returns 回傳此實例以支援鏈式調用
	 */
	where(column: string, operator: string, value: unknown): IQueryBuilder {
		this.whereConditions.push({ column, operator, value })
		return this
	}

	/**
	 * 取得符合條件的第一筆記錄
	 *
	 * @returns 回傳第一筆記錄物件，若找不到則回傳 null
	 * @throws 拋出資料庫查詢錯誤
	 */
	async first(): Promise<Record<string, unknown> | null> {
		try {
			let query = (this.getQueryDB() as any).table(this.tableName)
			this.logger?.debug(`FIRST from table: ${this.tableName}`, { tableName: this.tableName })

			// 應用累積的 WHERE 條件
			for (const cond of this.whereConditions) {
				this.logger?.debug(`WHERE ${cond.column} ${cond.operator} ${cond.value}`, { condition: cond })
				query = this.applyWhere(query, cond)
			}

			// 應用排序規則
			if (this.orderByConfig) {
				const dir = this.orderByConfig.direction === 'ASC' ? 'asc' : 'desc'
				query = query.orderBy(this.orderByConfig.column, dir)
			}

			// 強制限制為 1 筆記錄
			query = query.limit(1)

			// 調用 .get() 來實際執行查詢
			const result = await query.get()
			this.logger?.debug(`FIRST result type: ${typeof result}, isArray: ${Array.isArray(result)}`, { resultType: typeof result, isArray: Array.isArray(result) })

			// .get() 返回陣列，取第一個元素
			const rows = Array.isArray(result) ? result : []
			this.logger?.debug(`Returning ${rows.length ? 'one row' : 'no rows'}`, { rowCount: rows.length })

			return rows[0] || null
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			err.message = `AtlasQueryBuilder.first() failed: ${err.message}`
			this.logger?.error(`Error in first()`, err)
			throw err
		}
	}

	/**
	 * 取得符合條件的所有多筆記錄
	 *
	 * @returns 記錄物件陣列
	 * @throws 拋出資料庫查詢錯誤
	 */
	async select(): Promise<Record<string, unknown>[]> {
		try {
			let query = (this.getQueryDB() as any).table(this.tableName)
			this.logger?.debug(`SELECT from table: ${this.tableName}`, { tableName: this.tableName })

			// 應用所有 WHERE 條件
			for (const cond of this.whereConditions) {
				this.logger?.debug(`WHERE ${cond.column} ${cond.operator} ${cond.value}`, { condition: cond })
				query = this.applyWhere(query, cond)
			}

			// 應用排序
			if (this.orderByConfig) {
				const dir = this.orderByConfig.direction === 'ASC' ? 'asc' : 'desc'
				query = query.orderBy(this.orderByConfig.column, dir)
			}

			// 應用 OFFSET 位移
			if (this.offsetValue) {
				query = query.offset(this.offsetValue)
			}

			// 應用 LIMIT 限制筆數
			if (this.limitValue) {
				query = query.limit(this.limitValue)
			}

			// 調用 .get() 來實際執行查詢
			const result = await query.get()
			this.logger?.debug(`SELECT result type: ${typeof result}, isArray: ${Array.isArray(result)}`, { resultType: typeof result, isArray: Array.isArray(result) })

			// .get() 返回陣列
			const rows = Array.isArray(result) ? result : []
			this.logger?.debug(`Returning ${rows.length} rows`, { rowCount: rows.length })
			return rows
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			err.message = `AtlasQueryBuilder.select() failed: ${err.message}`
			this.logger?.error(`Error in select()`, err)
			throw err
		}
	}

	/**
	 * 插入一筆新記錄
	 *
	 * @param data - 要插入的資料物件
	 * @returns 非同步作業
	 */
	async insert(data: Record<string, unknown>): Promise<void> {
		try {
			await (this.getQueryDB() as any).table(this.tableName).insert(data)
		} catch (error) {
			this.logger?.error(`Error in insert()`, error instanceof Error ? error : new Error(String(error)))
			throw error
		}
	}

	/**
	 * 更新符合條件的記錄
	 *
	 * @param data - 要更新的欄位與數值
	 * @returns 非同步作業
	 */
	async update(data: Record<string, unknown>): Promise<void> {
		try {
			let query = (this.getQueryDB() as any).table(this.tableName)

			// 應用 WHERE 條件
			for (const cond of this.whereConditions) {
				query = this.applyWhere(query, cond)
			}

			await query.update(data)
		} catch (error) {
			this.logger?.error(`Error in update()`, error instanceof Error ? error : new Error(String(error)))
			throw error
		}
	}

	/**
	 * 刪除符合條件的記錄
	 *
	 * @returns 非同步作業
	 */
	async delete(): Promise<void> {
		try {
			let query = (this.getQueryDB() as any).table(this.tableName)

			// 應用 WHERE 條件
			for (const cond of this.whereConditions) {
				query = this.applyWhere(query, cond)
			}

			await query.delete()
		} catch (error) {
			this.logger?.error(`Error in delete()`, error instanceof Error ? error : new Error(String(error)))
			throw error
		}
	}

	/**
	 * 限制回傳的記錄數量
	 *
	 * @param value - 最大記錄筆數
	 * @returns 回傳此實例以支援鏈式調用
	 */
	limit(value: number): IQueryBuilder {
		this.limitValue = value
		return this
	}

	/**
	 * 跳過指定數量的記錄（分頁偏移）
	 *
	 * @param value - 跳過的筆數
	 * @returns 回傳此實例以支援鏈式調用
	 */
	offset(value: number): IQueryBuilder {
		this.offsetValue = value
		return this
	}

	/**
	 * 設定資料排序規則
	 *
	 * @param column - 排序欄位
	 * @param direction - 排序方向（ASC 或 DESC，預設為 ASC）
	 * @returns 回傳此實例以支援鏈式調用
	 */
	orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): IQueryBuilder {
		const normalizedDirection = direction.toUpperCase() as 'ASC' | 'DESC'
		this.orderByConfig = { column, direction: normalizedDirection }
		return this
	}

	/**
	 * 計算符合條件的記錄總筆數
	 *
	 * @returns 符合條件的總筆數
	 * @throws 拋出資料庫查詢錯誤
	 */
	async count(): Promise<number> {
		try {
			let query = (this.getQueryDB() as any).table(this.tableName)

			// 應用 WHERE 條件
			for (const cond of this.whereConditions) {
				query = this.applyWhere(query, cond)
			}

			// Atlas 使用 count() 方法直接回傳數字
			const count = await query.count()
			return count || 0
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			err.message = `AtlasQueryBuilder.count() failed: ${err.message}`
			this.logger?.error(`Error in count()`, err)
			throw err
		}
	}

	/**
	 * 建立範圍查詢條件（常用於時間範圍）
	 *
	 * @param column - 欄位名稱
	 * @param range - [開始值, 結束值] 陣列
	 * @returns 回傳此實例以支援鏈式調用
	 */
	whereBetween(column: string, range: [Date, Date]): IQueryBuilder {
		this.whereConditions.push({ column, operator: 'between', value: range })
		return this
	}

	/**
	 * IN 查詢
	 *
	 * @param column - 欄位名稱
	 * @param values - 值陣列
	 * @returns 回傳此實例以支援鏈式調用
	 */
	whereIn(column: string, values: unknown[]): any {
		this.whereConditions.push({ column, operator: 'in', value: values })
		return this
	}

	/**
	 * OR 條件
	 *
	 * @param column - 欄位名稱
	 * @param operator - 比較運算子
	 * @param value - 比較值
	 * @returns 回傳此實例以支援鏈式調用
	 */
	orWhere(column: string, operator: string, value: unknown): any {
		this.orConditions.push({ column, operator, value })
		return this
	}

	/**
	 * INNER JOIN
	 *
	 * @param table - 要 JOIN 的資料表名稱
	 * @param localColumn - 本表欄位名稱
	 * @param foreignColumn - 外表欄位名稱
	 * @returns 回傳此實例以支援鏈式調用
	 */
	join(table: string, localColumn: string, foreignColumn: string): any {
		this.joinClauses.push({ table, localColumn, foreignColumn, type: 'INNER' })
		return this
	}

	/**
	 * LEFT JOIN
	 *
	 * @param table - 要 JOIN 的資料表名稱
	 * @param localColumn - 本表欄位名稱
	 * @param foreignColumn - 外表欄位名稱
	 * @returns 回傳此實例以支援鏈式調用
	 */
	leftJoin(table: string, localColumn: string, foreignColumn: string): any {
		this.joinClauses.push({ table, localColumn, foreignColumn, type: 'LEFT' })
		return this
	}

	/**
	 * GROUP BY
	 *
	 * @param columns - 要分組的欄位名稱（可變參數）
	 * @returns 回傳此實例以支援鏈式調用
	 */
	groupBy(...columns: string[]): any {
		this.groupByColumns.push(...columns)
		return this
	}

	/**
	 * 內部輔助方法：將抽象的 WHERE 條件轉換為 Atlas 特定的查詢方法
	 * @param query - Atlas 原始查詢物件
	 * @param cond - 內部條件物件
	 * @returns 轉換後的查詢物件
	 * @private
	 */
	private applyWhere(query: any, cond: { column: string; operator: string; value: unknown }): any {
		switch (cond.operator) {
			case '=':
				return query.where(cond.column, '=', cond.value)
			case '!=':
			case '<>':
				return query.where(cond.column, '!=', cond.value)
			case '>':
				return query.where(cond.column, '>', cond.value)
			case '<':
				return query.where(cond.column, '<', cond.value)
			case '>=':
				return query.where(cond.column, '>=', cond.value)
			case '<=':
				return query.where(cond.column, '<=', cond.value)
			case 'like':
				return query.where(cond.column, 'like', cond.value)
			case 'in':
				return query.whereIn(cond.column, cond.value as any[])
			case 'between':
				return query.whereBetween(cond.column, cond.value as [Date, Date])
			default:
				throw new Error(`Unsupported operator: ${cond.operator}`)
		}
	}
}
