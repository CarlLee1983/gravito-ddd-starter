/**
 * @file IInventoryRepository.ts
 * @description 庫存 Repository Port 介面
 *
 * Domain Port（在 Domain 層定義）
 */

import type { InventoryAggregate } from '../Aggregates/InventoryAggregate'

/**
 * 庫存 Repository Port
 *
 * 負責 InventoryAggregate 的持久化與查詢。
 * 支援樂觀鎖版本控制。
 */
export interface IInventoryRepository {
	/**
	 * 根據商品 ID（SKU）查詢庫存
	 *
	 * @param productId - 商品 ID
	 * @returns Promise 包含庫存聚合根或 null
	 */
	findByProductId(productId: string): Promise<InventoryAggregate | null>

	/**
	 * 根據 ID 查詢庫存
	 *
	 * @param id - 庫存 ID
	 * @returns Promise 包含庫存聚合根或 null
	 */
	findById(id: string): Promise<InventoryAggregate | null>

	/**
	 * 保存庫存聚合根（新增或更新）
	 *
	 * 樂觀鎖：若版本不匹配，應拋出 OptimisticLockException
	 *
	 * @param inventory - 庫存聚合根
	 * @throws OptimisticLockException - 版本衝突
	 * @returns Promise<void>
	 */
	save(inventory: InventoryAggregate): Promise<void>

	/**
	 * 刪除庫存記錄
	 *
	 * @param id - 庫存 ID
	 * @returns Promise<void>
	 */
	delete(id: string): Promise<void>

	/**
	 * 查詢所有庫存（支援分頁）
	 *
	 * @param params - 分頁參數
	 * @returns Promise 包含庫存陣列
	 */
	findAll(params?: { limit?: number; offset?: number }): Promise<InventoryAggregate[]>

	/**
	 * 計算庫存總數
	 *
	 * @returns Promise 包含總數
	 */
	count(): Promise<number>
}
