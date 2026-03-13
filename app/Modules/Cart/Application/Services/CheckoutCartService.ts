/**
 * @file CheckoutCartService.ts
 * @description 購物車結帳應用層服務
 */

import type { CartResponseDTO } from '../DTOs/CartResponseDTO'
import { toCartResponseDTO } from '../DTOs/CartResponseDTO'
import type { ICartRepository } from '../../Domain/Repositories/ICartRepository'

/**
 * 購物車結帳應用層服務
 *
 * 發佈 CartCheckoutRequested 事件，供 Order Context 監聽
 */
export class CheckoutCartService {
	constructor(private cartRepository: ICartRepository) {}

	/**
	 * 執行結帳邏輯
	 *
	 * @param userId - 使用者 ID
	 * @returns Promise 結帳後的購物車 DTO
	 * @throws Error 若購物車不存在或為空
	 */
	async execute(userId: string): Promise<CartResponseDTO> {
		const cart = await this.cartRepository.findByUserId(userId)
		if (!cart) {
			throw new Error('購物車不存在')
		}

		if (cart.isEmpty()) {
			throw new Error('購物車為空，無法結帳')
		}

		// 請求結帳（發佈 CartCheckoutRequested 事件）
		cart.requestCheckout()

		// 保存變更，事件會被分派
		await this.cartRepository.save(cart)

		return toCartResponseDTO(cart)
	}
}
