/**
 * @file AddItemToCartService.ts
 * @description 加入商品至購物車的應用層服務
 */

import type { AddItemDTO } from '../DTOs/AddItemDTO'
import type { CartResponseDTO } from '../DTOs/CartResponseDTO'
import { toCartResponseDTO } from '../DTOs/CartResponseDTO'
import type { ICartRepository } from '../../Domain/Repositories/ICartRepository'
import type { IProductQueryPort } from '../../Domain/Services/IProductQueryPort'
import { Cart } from '../../Domain/Aggregates/Cart'
import { CartId } from '../../Domain/ValueObjects/CartId'
import { Quantity } from '../../Domain/ValueObjects/Quantity'

/**
 * 加入商品至購物車應用層服務
 *
 * 職責：
 * 1. 協調購物車和防腐層的查詢
 * 2. 驗證商品存在性與價格
 * 3. 調用聚合根方法以發佈事件
 * 4. 保存變更至倉儲
 */
export class AddItemToCartService {
	constructor(
		private cartRepository: ICartRepository,
		private productQuery: IProductQueryPort
	) {}

	/**
	 * 執行加入商品邏輯
	 *
	 * @param dto - 加入商品 DTO
	 * @returns Promise 更新後的購物車 DTO
	 * @throws Error 若商品不存在或數量無效
	 */
	async execute(dto: AddItemDTO): Promise<CartResponseDTO> {
		// 驗證商品
		const productInfo = await this.productQuery.getProductPrice(dto.productId)
		if (!productInfo?.exists) {
			throw new Error(`商品 ${dto.productId} 不存在`)
		}

		if (productInfo.price === undefined || productInfo.price <= 0) {
			throw new Error('商品價格無效')
		}

		// 驗證數量
		const quantity = Quantity.create(dto.quantity)

		// 取得或建立購物車
		const cartId = CartId.forUser(dto.userId)
		let cart = await this.cartRepository.findByUserId(dto.userId)

		if (!cart) {
			// 建立新購物車
			cart = Cart.create(cartId.value, dto.userId)
		}

		// 加入商品（發佈事件）
		cart.addItem(dto.productId, quantity, productInfo.price)

		// 保存至倉儲
		await this.cartRepository.save(cart)

		return toCartResponseDTO(cart)
	}
}
