/**
 * 數據庫存取抽象（Port）
 *
 * 定義與具體 ORM（如 Atlas）無關的查詢介面，讓各模組 Infrastructure 層
 * 可透過依賴注入替換為 mock，Domain/Application 與實際 DB 實作解耦。
 */

/**
 * 數據庫查詢建構器介面（抽象鏈式 API，支援測試替換）
 */
export interface IQueryBuilder {
	where(...args: unknown[]): IQueryBuilder
	first(): Promise<Record<string, unknown> | null>
	select(): Promise<Record<string, unknown>[]>
	insert(data: Record<string, unknown>): Promise<void>
	update(data: Record<string, unknown>): Promise<void>
	delete(): Promise<void>
	limit(n: number): IQueryBuilder
	offset(n: number): IQueryBuilder
	orderBy(column: string, direction: string): IQueryBuilder
	whereBetween(column: string, range: [Date, Date]): IQueryBuilder
	count(): Promise<number>
}

/**
 * 數據庫存取介面（用於依賴注入）
 */
export interface IDatabaseAccess {
	table(name: string): IQueryBuilder
}

/** 向後相容：沿用既有命名時可匯入此別名 */
export type DatabaseAccess = IDatabaseAccess
