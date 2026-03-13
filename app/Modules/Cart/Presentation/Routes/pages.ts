/**
 * @file pages.ts
 * @description Cart 模組頁面路由
 *
 * 處理前端 SSR 頁面請求（購物車頁面）
 */

import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { ICartRepository } from '../../Domain/Repositories/ICartRepository'

/**
 * 註冊 Cart 頁面路由
 *
 * @param router - 模組路由器
 * @param cartRepository - 購物車 Repository
 * @param pageGuardMiddleware - 頁面認證中間件（可選）
 */
export function registerPageRoutes(
  router: IModuleRouter,
  cartRepository: ICartRepository,
  pageGuardMiddleware?: any
): void {
  // 購物車頁面（受保護）
  const middlewares = pageGuardMiddleware ? [pageGuardMiddleware] : []
  router.get('/cart', middlewares, async (ctx: IHttpContext) => {
    try {
      const userId = ctx.get('authenticatedUserId') as string | undefined
      if (!userId) {
        return ctx.redirect('/login')
      }

      let cart = await cartRepository.findByUserId(userId)

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
          console.error('[CartPageRoute] Error adding items to cart:', itemError)
        }

        await cartRepository.save(cart)
      }

      return ctx.render('Cart/Index', { cart })
    } catch (error) {
      console.error('[CartPageRoute] Error:', error)
      return ctx.render('Cart/Index', { cart: null })
    }
  })
}
