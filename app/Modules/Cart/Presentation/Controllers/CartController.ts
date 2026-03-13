/**
 * @file CartController.ts
 * @description 購物車 HTTP 控制器
 */

import type { Request, Response } from 'express'
import type { AddItemToCartService } from '../../Application/Services/AddItemToCartService'
import type { RemoveItemFromCartService } from '../../Application/Services/RemoveItemFromCartService'
import type { CheckoutCartService } from '../../Application/Services/CheckoutCartService'
import type { ICartRepository } from '../../Domain/Repositories/ICartRepository'
import { toCartResponseDTO } from '../../Application/DTOs/CartResponseDTO'

/**
 * 購物車控制器
 *
 * 處理 HTTP 請求和回應，委派業務邏輯至應用層服務
 */
export class CartController {
	constructor(
		private addItemService: AddItemToCartService,
		private removeItemService: RemoveItemFromCartService,
		private checkoutService: CheckoutCartService,
		private cartRepository: ICartRepository
	) {}

	/**
	 * 取得購物車內容
	 *
	 * GET /carts/:userId
	 */
	async getCart(req: Request, res: Response): Promise<void> {
		try {
			const { userId } = req.params

			const cart = await this.cartRepository.findByUserId(userId)
			if (!cart) {
				res.status(404).json({ success: false, error: '購物車不存在' })
				return
			}

			res.json({ success: true, data: toCartResponseDTO(cart) })
		} catch (error) {
			res.status(500).json({ success: false, error: String(error) })
		}
	}

	/**
	 * 加入商品至購物車
	 *
	 * POST /carts/:userId/items
	 */
	async addItem(req: Request, res: Response): Promise<void> {
		try {
			const { userId } = req.params
			const { productId, quantity } = req.body

			if (!productId || !quantity) {
				res.status(400).json({ success: false, error: '缺少必要欄位' })
				return
			}

			const cartDto = await this.addItemService.execute({
				userId,
				productId,
				quantity: Number(quantity),
			})

			res.json({ success: true, data: cartDto })
		} catch (error) {
			const message = String(error)
			const statusCode = message.includes('不存在') ? 404 : 400
			res.status(statusCode).json({ success: false, error: message })
		}
	}

	/**
	 * 移除購物車項目
	 *
	 * DELETE /carts/:userId/items/:productId
	 */
	async removeItem(req: Request, res: Response): Promise<void> {
		try {
			const { userId, productId } = req.params

			const cartDto = await this.removeItemService.execute(userId, productId)

			res.json({ success: true, data: cartDto })
		} catch (error) {
			const message = String(error)
			const statusCode = message.includes('不存在') ? 404 : 400
			res.status(statusCode).json({ success: false, error: message })
		}
	}

	/**
	 * 更新購物車項目數量
	 *
	 * PATCH /carts/:userId/items/:productId
	 */
	async updateItemQuantity(req: Request, res: Response): Promise<void> {
		try {
			const { userId } = req.params
			const { quantity } = req.body

			if (!quantity) {
				res.status(400).json({ success: false, error: '缺少數量欄位' })
				return
			}

			const cart = await this.cartRepository.findByUserId(userId)
			if (!cart) {
				res.status(404).json({ success: false, error: '購物車不存在' })
				return
			}

			// 這個功能可以延伸，現在先省略實作
			// cart.updateItemQuantity(productId, Quantity.create(quantity))
			// await this.cartRepository.save(cart)

			res.json({ success: true, data: toCartResponseDTO(cart) })
		} catch (error) {
			res.status(500).json({ success: false, error: String(error) })
		}
	}

	/**
	 * 清空購物車
	 *
	 * DELETE /carts/:userId
	 */
	async clearCart(req: Request, res: Response): Promise<void> {
		try {
			const { userId } = req.params

			const cart = await this.cartRepository.findByUserId(userId)
			if (!cart) {
				res.status(404).json({ success: false, error: '購物車不存在' })
				return
			}

			cart.clear()
			await this.cartRepository.save(cart)

			res.json({ success: true, message: '購物車已清空' })
		} catch (error) {
			res.status(500).json({ success: false, error: String(error) })
		}
	}

	/**
	 * 結帳
	 *
	 * POST /carts/:userId/checkout
	 */
	async checkout(req: Request, res: Response): Promise<void> {
		try {
			const { userId } = req.params

			const cartDto = await this.checkoutService.execute(userId)

			res.json({ success: true, data: cartDto, message: '結帳成功，訂單已建立' })
		} catch (error) {
			const message = String(error)
			const statusCode = message.includes('不存在') ? 404 : 400
			res.status(statusCode).json({ success: false, error: message })
		}
	}
}
