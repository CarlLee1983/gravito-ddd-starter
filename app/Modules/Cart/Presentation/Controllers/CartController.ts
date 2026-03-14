/**
 * @file CartController.ts
 * @description 購物車 HTTP 控制器
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
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
	async getCart(ctx: IHttpContext): Promise<Response> {
		try {
			const { userId } = ctx.params

			const cart = await this.cartRepository.findByUserId(userId!)
			if (!cart) {
				return ctx.json({ success: false, error: '購物車不存在' }, 404)
			}

			return ctx.json({ success: true, data: toCartResponseDTO(cart) })
		} catch (error) {
			return ctx.json({ success: false, error: String(error) }, 500)
		}
	}

	/**
	 * 加入商品至購物車
	 *
	 * POST /carts/:userId/items
	 */
	async addItem(ctx: IHttpContext): Promise<Response> {
		try {
			const { userId } = ctx.params
			const { productId, quantity } = await ctx.getJsonBody<{ productId: string; quantity: number }>()

			if (!productId || !quantity) {
				return ctx.json({ success: false, error: '缺少必要欄位' }, 400)
			}

			const cartDto = await this.addItemService.execute({
				userId: userId!,
				productId,
				quantity: Number(quantity),
			})

			return ctx.json({ success: true, data: cartDto })
		} catch (error) {
			const message = String(error)
			const statusCode = message.includes('不存在') ? 404 : 400
			return ctx.json({ success: false, error: message }, statusCode)
		}
	}

	/**
	 * 移除購物車項目
	 *
	 * DELETE /carts/:userId/items/:productId
	 */
	async removeItem(ctx: IHttpContext): Promise<Response> {
		try {
			const { userId, productId } = ctx.params

			const cartDto = await this.removeItemService.execute(userId!, productId!)

			return ctx.json({ success: true, data: cartDto })
		} catch (error) {
			const message = String(error)
			const statusCode = message.includes('不存在') ? 404 : 400
			return ctx.json({ success: false, error: message }, statusCode)
		}
	}

	/**
	 * 更新購物車項目數量
	 *
	 * PATCH /carts/:userId/items/:productId
	 */
	async updateItemQuantity(ctx: IHttpContext): Promise<Response> {
		try {
			const { userId } = ctx.params
			const { quantity } = await ctx.getJsonBody<{ quantity: number }>()

			if (!quantity) {
				return ctx.json({ success: false, error: '缺少數量欄位' }, 400)
			}

			const cart = await this.cartRepository.findByUserId(userId!)
			if (!cart) {
				return ctx.json({ success: false, error: '購物車不存在' }, 404)
			}

			// 這個功能可以延伸，現在先省略實作
			// cart.updateItemQuantity(productId, Quantity.create(quantity))
			// await this.cartRepository.save(cart)

			return ctx.json({ success: true, data: toCartResponseDTO(cart) })
		} catch (error) {
			return ctx.json({ success: false, error: String(error) }, 500)
		}
	}

	/**
	 * 清空購物車
	 *
	 * DELETE /carts/:userId
	 */
	async clearCart(ctx: IHttpContext): Promise<Response> {
		try {
			const { userId } = ctx.params

			const cart = await this.cartRepository.findByUserId(userId!)
			if (!cart) {
				return ctx.json({ success: false, error: '購物車不存在' }, 404)
			}

			cart.clear()
			await this.cartRepository.save(cart)

			return ctx.json({ success: true, message: '購物車已清空' })
		} catch (error) {
			return ctx.json({ success: false, error: String(error) }, 500)
		}
	}

	/**
	 * 結帳
	 *
	 * POST /carts/:userId/checkout
	 */
	async checkout(ctx: IHttpContext): Promise<Response> {
		try {
			const { userId } = ctx.params

			const cartDto = await this.checkoutService.execute(userId!)

			return ctx.json({ success: true, data: cartDto, message: '結帳成功，訂單已建立' })
		} catch (error) {
			const message = String(error)
			const statusCode = message.includes('不存在') ? 404 : 400
			return ctx.json({ success: false, error: message }, statusCode)
		}
	}
}
