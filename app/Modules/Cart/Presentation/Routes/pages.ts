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
      const cart = await cartRepository.findByUserId(userId)
      return ctx.render('Cart/Index', { cart })
    } catch (error) {
      return ctx.render('Cart/Index', { cart: null })
    }
  })
}
