/**
 * @file RemoveItemFromCartService.ts
 * @description 從購物車移除商品的應用層服務
 */

import type { CartResponseDTO } from '../DTOs/CartResponseDTO'
import { toCartResponseDTO } from '../DTOs/CartResponseDTO'
import type { ICartRepository } from '../../Domain/Repositories/ICartRepository'

/**
 * 移除商品應用層服務
 */
export class RemoveItemFromCartService {
	constructor(private cartRepository: ICartRepository) {}

	/**
	 * 執行移除商品邏輯
	 *
	 * @param userId - 使用者 ID
	 * @param productId - 商品 ID
	 * @returns Promise 更新後的購物車 DTO
	 * @throws Error 若購物車或商品不存在
	 */
	async execute(userId: string, productId: string): Promise<CartResponseDTO> {
		const cart = await this.cartRepository.findByUserId(userId)
		if (!cart) {
			throw new Error('購物車不存在')
		}

		// 移除商品（發佈事件）
		cart.removeItem(productId)

		// 保存變更
		await this.cartRepository.save(cart)

		return toCartResponseDTO(cart)
	}
}
