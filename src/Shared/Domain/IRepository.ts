/**
 * 基礎倉儲接口 - 定義所有倉儲的通用契約
 *
 * 注意：此接口定義在 Domain 層，實現在 Infrastructure 層
 * 遵循依賴反轉原則 - 高層不依賴低層實現
 */

import type { BaseEntity } from './BaseEntity'

export interface IRepository<T extends BaseEntity> {
	/**
	 * 保存實體（新增或更新）
	 */
	save(entity: T): Promise<void>

	/**
	 * 根據 ID 查詢實體
	 */
	findById(id: string): Promise<T | null>

	/**
	 * 刪除實體
	 */
	delete(id: string): Promise<void>

	/**
	 * 查詢所有實體（支援分頁和過濾）
	 */
	findAll(params?: {
		limit?: number
		offset?: number
		[key: string]: any
	}): Promise<T[]>

	/**
	 * 計算符合條件的實體總數
	 */
	count(params?: { [key: string]: any }): Promise<number>
}
