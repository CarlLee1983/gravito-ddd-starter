/**
 * @file CartPageController.ts
 * @description Cart 頁面控制器
 *
 * 處理 SSR 頁面請求：購物車頁面。
 * 封裝購物車頁面的邏輯（取得購物車、未登入重定向等）。
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { ICartRepository } from '../../Domain/Repositories/ICartRepository'

/**
 * Cart 頁面控制器
 *
 * 負責購物車頁面的顯示邏輯。
 */
export class CartPageController {
  constructor(private readonly cartRepository: ICartRepository) {}

  /**
   * 顯示購物車頁面。
   * 需由 Page Guard 中間件先行設定 authenticatedUserId；未登入時重定向到 /login。
   */
  async showCart(ctx: IHttpContext): Promise<Response> {
    try {
      const userId = ctx.get('authenticatedUserId') as string | undefined
      if (!userId) {
        return ctx.redirect('/login')
      }

      let cart = await this.cartRepository.findByUserId(userId)

      // 如果購物車不存在，自動建立並加入示例項目
      if (!cart) {
        const { Cart } = await import('../../Domain/Aggregates/Cart')
        const { Quantity } = await import('../../Domain/ValueObjects/Quantity')
        const cartId = `${userId}_cart`
        cart = Cart.create(cartId, userId)

        try {
          // 加入示例項目（與前端 mock 資料相符）
          cart.addItem('product-1', Quantity.create(1), 89.99)
          cart.addItem('product-2', Quantity.create(1), 149.00)
        } catch (itemError) {
          console.error('[CartPageController] Error adding items to cart:', itemError)
        }

        await this.cartRepository.save(cart)
      }

      return ctx.render('Cart/Index', { cart })
    } catch (error) {
      console.error('[CartPageController] Error:', error)
      return ctx.render('Cart/Index', { cart: null })
    }
  }
}
