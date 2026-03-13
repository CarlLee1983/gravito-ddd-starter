/**
 * @file pages.ts
 * @description Auth 模組頁面路由
 *
 * 處理前端 SSR 頁面請求（Welcome、Login、Register、Dashboard）
 */

import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/**
 * 註冊 Auth 頁面路由
 *
 * @param router - 模組路由器
 */
export function registerPageRoutes(router: IModuleRouter): void {
  // 登入頁面
  router.get('/login', [], async (ctx: IHttpContext) => {
    return ctx.render('Auth/Login')
  })

  // 註冊頁面
  router.get('/register', [], async (ctx: IHttpContext) => {
    return ctx.render('Auth/Register')
  })

  // 個人儀表板（需 JWT Guard）
  router.get('/dashboard', [], async (ctx: IHttpContext) => {
    const userId = ctx.get('authenticatedUserId') as string | undefined
    if (!userId) {
      // 未登入時重導到登入頁面
      return ctx.redirect('/login')
    }
    return ctx.render('Dashboard')
  })
}
