/**
 * 基礎查詢倉庫抽象類
 *
 * @module BaseQueryRepository
 * @description
 * 為 CQRS 讀側提供共用的查詢邏輯基礎實現。
 *
 * **DDD 角色**
 * - 層級：Infrastructure Base
 * - 職責：提供查詢倉庫的共用實現，支持 Raw SQL、QueryBuilder 等多種資料存取方式
 *
 * **使用場景**
 * 1. QueryBuilder 查詢（數據庫無關）
 * 2. Raw SQL 查詢（性能最佳化，但需 ORM 適配層處理）
 * 3. 複雜聚合查詢（JOIN、GROUP BY 等）
 *
 * **繼承實現**
 * 具體查詢倉庫應繼承此類，實現自定義查詢邏輯：
 *
 * ```typescript
 * export class UserQueryRepository
 *   extends BaseQueryRepository<UserReadModel>
 *   implements IUserQueryRepository {
 *
 *   async getUsersByEmail(email: string): Promise<UserReadModel[]> {
 *     return this.queryBuilder
 *       .where('email', '=', email)
 *       .select()
 *   }
 *
 *   async countActiveUsers(): Promise<number> {
 *     return this.queryBuilder
 *       .where('created_at', '>=', lastMonth)
 *       .count()
 *   }
 * }
 * ```
 *
 * @public
 * @abstract
 */

import type { IQueryBuilder } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IQueryRepository } from './IQueryRepository'

/**
 * 基礎查詢倉庫抽象類
 *
 * @template T - ReadModel 型別
 */
export abstract class BaseQueryRepository<T> implements IQueryRepository<T> {
	/**
	 * 建構子
	 *
	 * @param queryBuilder - 查詢建構器實例（可以是 Drizzle、Raw SQL、QueryBuilder 等）
	 * @param mapToReadModel - 將資料庫行映射到 ReadModel 的函數
	 *
	 * @example
	 * ```typescript
	 * constructor(
	 *   private queryBuilder: IQueryBuilder,
	 *   private mapToReadModel: (row: any) => UserReadModel
	 * ) {
	 *   super(queryBuilder, mapToReadModel)
	 * }
	 * ```
	 */
	constructor(
		protected queryBuilder: IQueryBuilder,
		protected mapToReadModel: (row: any) => T
	) {}

	/**
	 * 取得所有記錄
	 *
	 * @returns 所有查詢結果的 ReadModel 陣列
	 *
	 * @example
	 * ```typescript
	 * const allUsers = await userQueryRepository.getAll()
	 * ```
	 */
	async getAll(): Promise<T[]> {
		const rows = await this.queryBuilder.select()
		return rows.map(row => this.mapToReadModel(row))
	}

	/**
	 * 根據 ID 取得單筆記錄
	 *
	 * @param id - 記錄 ID
	 * @returns 查詢結果的 ReadModel，若不存在則返回 null
	 *
	 * @example
	 * ```typescript
	 * const user = await userQueryRepository.getById('user-123')
	 * ```
	 */
	async getById(id: string): Promise<T | null> {
		const row = await this.queryBuilder.where('id', '=', id).first()
		return row ? this.mapToReadModel(row) : null
	}

	/**
	 * 分頁查詢
	 *
	 * @param page - 頁碼（從 1 開始）
	 * @param limit - 每頁筆數
	 * @returns 分頁結果物件，包含 items、total、page、limit
	 *
	 * @throws 當頁碼或 limit 無效時
	 *
	 * @example
	 * ```typescript
	 * const result = await userQueryRepository.getPaginated(1, 20)
	 * // { items: [...], total: 100, page: 1, limit: 20 }
	 * ```
	 */
	async getPaginated(
		page: number,
		limit: number
	): Promise<{
		items: T[]
		total: number
		page: number
		limit: number
	}> {
		if (page < 1 || limit < 1) {
			throw new Error('Page and limit must be greater than 0')
		}

		const offset = (page - 1) * limit

		// 並行查詢：取得分頁資料和總筆數
		const [rows, total] = await Promise.all([
			this.queryBuilder.offset(offset).limit(limit).select(),
			this.queryBuilder.count()
		])

		return {
			items: rows.map(row => this.mapToReadModel(row)),
			total,
			page,
			limit
		}
	}

	/**
	 * 統計符合條件的記錄總筆數
	 *
	 * @returns 記錄總筆數
	 *
	 * @example
	 * ```typescript
	 * const count = await userQueryRepository.count()
	 * ```
	 */
	async count(): Promise<number> {
		return this.queryBuilder.count()
	}
}
