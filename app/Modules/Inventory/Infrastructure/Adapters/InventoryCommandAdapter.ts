/**
 * @file InventoryCommandAdapter.ts
 * @description Inventory 防腐層適配器
 *
 * 實現 Cart 模組的 IInventoryCommandPort，
 * 將其操作翻譯為 Inventory 領域操作。
 *
 * 位置：Inventory Infrastructure/Adapters
 * 角色：Adapter（在 Inventory 側實現 Cart 的 Port）
 */

import type { IInventoryCommandPort } from '@/Modules/Cart/Domain/Ports/IInventoryCommandPort'
import type { IInventoryRepository } from '../../Domain/Repositories/IInventoryRepository'
import { InventoryAggregate } from '../../Domain/Aggregates/InventoryAggregate'

/**
 * Inventory 命令適配器
 *
 * 橋接 Cart 與 Inventory 的防腐層。
 * - 接收 Cart 的命令（用 IInventoryCommandPort 介面）
 * - 翻譯為 Inventory 領域操作
 * - 返回 Cart 期望的結果格式
 */
export class InventoryCommandAdapter implements IInventoryCommandPort {
	constructor(private readonly inventoryRepository: IInventoryRepository) {}

	/**
	 * 查詢商品庫存可用性
	 *
	 * **翻譯邏輯**:
	 * 1. 查詢 Inventory 聚合根
	 * 2. 檢查 sku.available >= requiredQuantity
	 * 3. 返回布林值 + 可用庫存
	 */
	async checkAvailability(
		productId: string,
		requiredQuantity: number
	): Promise<{ available: boolean; currentStock: number }> {
		// 查詢庫存
		const inventory = await this.inventoryRepository.findByProductId(productId)

		if (!inventory) {
			throw new Error(`商品不存在：productId=${productId}`)
		}

		// 檢查可用性
		const available = inventory.hasAvailable(requiredQuantity)

		return {
			available,
			currentStock: inventory.available,
		}
	}

	/**
	 * 預留庫存
	 *
	 * **翻譯邏輯**:
	 * 1. 查詢 Inventory 聚合根
	 * 2. 呼叫 inventory.reserve(quantity, orderId)
	 * 3. 保存聚合根（產生 InventoryReserved 事件）
	 * 4. 返回預留結果
	 *
	 * **異常處理**:
	 * - 庫存不足 → throw Error
	 * - 樂觀鎖衝突 → throw OptimisticLockException（傳播）
	 */
	async reserve(
		productId: string,
		quantity: number,
		orderId: string
	): Promise<{ reservationId: string; reserved: number; available: number }> {
		// 查詢庫存
		const inventory = await this.inventoryRepository.findByProductId(productId)

		if (!inventory) {
			throw new Error(`商品不存在：productId=${productId}`)
		}

		// 預留庫存（可能拋出 Error）
		inventory.reserve(quantity, orderId)

		// 保存聚合根（可能拋出 OptimisticLockException）
		await this.inventoryRepository.save(inventory)

		// 返回結果
		return {
			reservationId: inventory.id,
			reserved: inventory.reserved,
			available: inventory.available,
		}
	}

	/**
	 * 扣減庫存
	 *
	 * **翻譯邏輯**:
	 * 1. 查詢 Inventory 聚合根
	 * 2. 呼叫 inventory.deduct(quantity, orderId)
	 * 3. 保存聚合根（產生 InventoryDeducted 事件）
	 * 4. 返回扣減結果
	 */
	async deduct(
		productId: string,
		quantity: number,
		orderId: string
	): Promise<{ inventoryId: string; remainingStock: number }> {
		// 查詢庫存
		const inventory = await this.inventoryRepository.findByProductId(productId)

		if (!inventory) {
			throw new Error(`商品不存在：productId=${productId}`)
		}

		// 扣減庫存
		inventory.deduct(quantity, orderId)

		// 保存聚合根
		await this.inventoryRepository.save(inventory)

		// 返回結果
		return {
			inventoryId: inventory.id,
			remainingStock: inventory.quantity,
		}
	}

	/**
	 * 釋放預留庫存（補償操作）
	 *
	 * **翻譯邏輯**:
	 * 1. 查詢 Inventory 聚合根
	 * 2. 呼叫 inventory.release(quantity, orderId, reason)
	 * 3. 保存聚合根（產生 InventoryReleased 事件）
	 *
	 * **使用場景**:
	 * - CheckoutSaga 補償步驟
	 * - 訂單失敗時自動恢復庫存
	 */
	async release(
		productId: string,
		quantity: number,
		orderId: string,
		reason: string = 'order_cancelled'
	): Promise<void> {
		// 查詢庫存
		const inventory = await this.inventoryRepository.findByProductId(productId)

		if (!inventory) {
			throw new Error(`商品不存在：productId=${productId}`)
		}

		// 釋放預留
		inventory.release(quantity, orderId, reason)

		// 保存聚合根
		await this.inventoryRepository.save(inventory)
	}
}
