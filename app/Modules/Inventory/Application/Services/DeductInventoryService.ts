/**
 * @file DeductInventoryService.ts
 * @description 扣減庫存應用服務
 *
 * 使用案例：訂單支付成功時，確認預留的庫存為已扣減。
 */

import type { IInventoryRepository } from '../../Domain/Repositories/IInventoryRepository'

export interface DeductInventoryRequest {
	readonly productId: string
	readonly quantity: number
	readonly orderId: string
}

export interface DeductInventoryResponse {
	readonly inventoryId: string
	readonly sku: string
	readonly quantity: number
	readonly available: number
}

/**
 * 扣減庫存應用服務
 *
 * 職責：
 * 1. 查詢庫存聚合根
 * 2. 驗證預留庫存充足
 * 3. 執行扣減操作（預留→已售出）
 * 4. 持久化聚合根
 *
 * **與 ReserveInventoryService 的區別**:
 * - Reserve：預留庫存（可用 - 預留）
 * - Deduct：扣減庫存（總庫存 - 數量）
 */
export class DeductInventoryService {
	constructor(private readonly inventoryRepository: IInventoryRepository) {}

	/**
	 * 執行扣減庫存
	 *
	 * **流程**:
	 * 1. 根據商品 ID 查詢庫存
	 * 2. 驗證庫存存在
	 * 3. 驗證預留庫存充足
	 * 4. 呼叫 InventoryAggregate.deduct()
	 * 5. 保存聚合根
	 * 6. 返回扣減結果
	 *
	 * **條件**：
	 * - 必須先調用 ReserveInventoryService
	 * - 訂單必須已支付（PaymentSucceeded）
	 *
	 * @param request - 扣減請求
	 * @returns 扣減結果
	 * @throws Error 若庫存不存在或預留不足
	 * @throws OptimisticLockException 版本衝突時拋出
	 */
	async execute(request: DeductInventoryRequest): Promise<DeductInventoryResponse> {
		// 1. 查詢庫存
		const inventory = await this.inventoryRepository.findByProductId(request.productId)

		if (!inventory) {
			throw new Error(`商品庫存不存在：productId=${request.productId}`)
		}

		// 2. 驗證預留庫存
		if (inventory.reserved < request.quantity) {
			throw new Error(
				`預留庫存不足：需要扣減 ${request.quantity}，預留 ${inventory.reserved}`
			)
		}

		// 3. 執行扣減（產生 InventoryDeducted 事件）
		inventory.deduct(request.quantity, request.orderId)

		// 4. 保存聚合根
		await this.inventoryRepository.save(inventory)

		// 5. 返回結果
		return {
			inventoryId: inventory.id,
			sku: inventory.skuCode,
			quantity: inventory.quantity,
			available: inventory.available,
		}
	}
}
