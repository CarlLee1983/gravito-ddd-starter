/**
 * 查詢倉庫介面（CQRS 讀側）
 *
 * @module IQueryRepository
 * @description
 * 定義 CQRS 架構中，讀側（Query Side）的通用介面。
 * 與 WriteRepository（命令側）分離，專注於查詢最佳化。
 *
 * **DDD 角色**
 * - 層級：Application Port (Query)
 * - 職責：定義讀側查詢的標準契約，支持 Raw SQL、QueryBuilder 等多種實現
 *
 * **設計原則**
 * - 與 ORM 無關：實現可用 QueryBuilder 或 Raw SQL
 * - 與數據庫系統無關：透過 QueryBuilder 適配不同數據庫
 * - 返回 ReadModel：與 Domain Entity 分離的讀取模型
 *
 * @public
 */

/**
 * 通用查詢倉庫介面
 *
 * @template T - ReadModel 型別，表示查詢結果的數據結構
 *
 * @example
 * ```typescript
 * // 讀側查詢倉庫
 * export interface IUserQueryRepository extends IQueryRepository<UserReadModel> {
 *   getUsersByEmail(email: string): Promise<UserReadModel[]>
 *   countActiveUsers(): Promise<number>
 * }
 *
 * // 實現類別
 * export class UserQueryRepository
 *   extends BaseQueryRepository<UserReadModel>
 *   implements IUserQueryRepository {
 *   // 具體實現...
 * }
 * ```
 */
export interface IQueryRepository<T> {
	/**
	 * 取得所有記錄
	 *
	 * @returns 所有查詢結果
	 */
	getAll(): Promise<T[]>

	/**
	 * 根據 ID 取得單筆記錄
	 *
	 * @param id - 記錄 ID
	 * @returns 查詢結果，若不存在則返回 null
	 */
	getById(id: string): Promise<T | null>

	/**
	 * 分頁查詢
	 *
	 * @param page - 頁碼（從 1 開始）
	 * @param limit - 每頁筆數
	 * @returns 分頁結果與總筆數
	 */
	getPaginated(page: number, limit: number): Promise<{
		items: T[]
		total: number
		page: number
		limit: number
	}>

	/**
	 * 統計符合條件的記錄總筆數
	 *
	 * @returns 記錄總筆數
	 */
	count(): Promise<number>
}
