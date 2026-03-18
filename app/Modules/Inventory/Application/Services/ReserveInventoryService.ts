/**
 * @file ReserveInventoryService.ts
 * @description 預留庫存應用服務
 *
 * 使用案例：購物車結帳時，為訂單預留商品庫存。
 * 驗證庫存充足，若成功產生 InventoryReserved 事件。
 */

import type { IInventoryRepository } from '../../Domain/Repositories/IInventoryRepository'
import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import { InventoryAggregate } from '../../Domain/Aggregates/InventoryAggregate'

export interface ReserveInventoryRequest {
	readonly productId: string
	readonly quantity: number
	readonly orderId: string
}

export interface ReserveInventoryResponse {
	readonly inventoryId: string
	readonly sku: string
	readonly reserved: number
	readonly available: number
}

/**
 * 預留庫存應用服務
 *
 * 職責：
 * 1. 驗證商品庫存是否存在
 * 2. 驗證可用庫存是否充足
 * 3. 執行預留操作
 * 4. 持久化聚合根（包含領域事件）
 *
 * 使用 IDatabaseAccess 而非具體 ORM，確保應用層零 ORM 依賴。
 */
export class ReserveInventoryService {
	constructor(
		private readonly inventoryRepository: IInventoryRepository,
		private readonly db: IDatabaseAccess
	) {}

	/**
	 * 執行預留庫存
	 *
	 * **流程**:
	 * 1. 根據商品 ID 查詢庫存
	 * 2. 驗證庫存存在
	 * 3. 驗證可用庫存充足
	 * 4. 呼叫 InventoryAggregate.reserve()
	 * 5. 保存聚合根（樂觀鎖）
	 * 6. 返回預留結果
	 *
	 * @param request - 預留請求
	 * @returns 預留結果
	 * @throws Error 若庫存不存在或不足
	 * @throws OptimisticLockException 版本衝突時拋出
	 */
	async execute(request: ReserveInventoryRequest): Promise<ReserveInventoryResponse> {
		// 1. 查詢庫存
		const inventory = await this.inventoryRepository.findByProductId(request.productId)

		if (!inventory) {
			throw new Error(`商品庫存不存在：productId=${request.productId}`)
		}

		// 2. 驗證可用庫存
		if (!inventory.hasAvailable(request.quantity)) {
			throw new Error(
				`庫存不足：需要 ${request.quantity}，可用 ${inventory.available} (總庫存: ${inventory.quantity}, 已預留: ${inventory.reserved})`
			)
		}

		// 3. 執行預留（產生 InventoryReserved 事件）
		inventory.reserve(request.quantity, request.orderId)

		// 4. 保存聚合根（在 Transaction 中，若使用 Outbox 則同時寫入 Outbox）
		await this.inventoryRepository.save(inventory)

		// 5. 返回結果
		return {
			inventoryId: inventory.id,
			sku: inventory.skuCode,
			reserved: inventory.reserved,
			available: inventory.available,
		}
	}
}
