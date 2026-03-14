/**
 * @file pages.ts
 * @description Auth 模組頁面路由
 *
 * 處理前端 SSR 頁面請求（Welcome、Login、Register、Dashboard）
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'

/**
 * 從 Cookie 中提取 Token
 */
function getTokenFromCookie(ctx: IHttpContext): string | null {
  const cookieHeader = ctx.getHeader('Cookie')
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').map(c => c.trim())
  const authCookie = cookies.find(c => c.startsWith('auth_token='))
  if (!authCookie) return null

  return authCookie.substring('auth_token='.length) || null
}

/**
 * 註冊 Auth 頁面路由
 *
 * @param router - 模組路由器
 * @param pageGuardMiddleware - 頁面路由認證中間件（可選）
 * @param tokenValidator - Token 驗證器（可選，用於檢查登入狀態）
 */
export function registerPageRoutes(
  router: IModuleRouter,
  pageGuardMiddleware?: any,
  tokenValidator?: any
): void {
  // 登入頁面（公開，但已登入時重定向到 Dashboard）
  router.get('/login', [], async (ctx: IHttpContext) => {
    // 嘗試檢查用戶是否已登入
    if (tokenValidator) {
      const token = getTokenFromCookie(ctx)
      if (token) {
        try {
          const result = await tokenValidator.validate(token)
          if (result) {
            // 已登入，重定向到 Dashboard
            return ctx.redirect('/dashboard')
          }
        } catch {
          // Token 無效，繼續顯示登入表單
        }
      }
    }
    return ctx.render('Auth/Login')
  })

  // 註冊頁面（公開，但已登入時重定向到 Dashboard）
  router.get('/register', [], async (ctx: IHttpContext) => {
    // 嘗試檢查用戶是否已登入
    if (tokenValidator) {
      const token = getTokenFromCookie(ctx)
      if (token) {
        try {
          const result = await tokenValidator.validate(token)
          if (result) {
            // 已登入，重定向到 Dashboard
            return ctx.redirect('/dashboard')
          }
        } catch {
          // Token 無效，繼續顯示註冊表單
        }
      }
    }
    return ctx.render('Auth/Register')
  })

  // 個人儀表板（受保護，需要認證）
  const dashboardMiddlewares = pageGuardMiddleware ? [pageGuardMiddleware] : []
  router.get('/dashboard', dashboardMiddlewares, async (ctx: IHttpContext) => {
    const userId = ctx.get('authenticatedUserId') as string | undefined
    if (!userId) {
      // 未登入時重導到登入頁面
      return ctx.redirect('/login')
    }
    return ctx.render('Dashboard')
  })
}
