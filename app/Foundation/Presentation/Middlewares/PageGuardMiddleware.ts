/**
 * @file PageGuardMiddleware.ts
 * @description 頁面路由認證守衛中間件
 *
 * 與 JwtGuardMiddleware 不同，此中間件用於 SSR 頁面路由：
 * - 認證失敗時重定向到登入頁面
 * - 不返回 JSON 錯誤響應
 * - 用於 `/dashboard` 等受保護的頁面
 */

import type { ITokenValidator } from '@/Foundation/Infrastructure/Ports/Auth/ITokenValidator'
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'

/**
 * 創建頁面路由認證守衛中間件
 *
 * @param tokenValidator - Token 驗證器（Port 介面實現）
 * @returns 中間件函數
 *
 * 如果驗證失敗或 Token 缺失，重定向到 /login
 * 如果驗證成功，設定 authenticatedUserId 並繼續
 */
export function createPageGuardMiddleware(
  tokenValidator: ITokenValidator
): (ctx: IHttpContext, next: () => Promise<any>) => Promise<Response> {
  return async (ctx: IHttpContext, next: () => Promise<any>) => {
    // 優先嘗試從 Authorization Header 提取 Token
    let token: string | null = null
    const authHeader = ctx.getHeader('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    }

    // 如果沒有在 Authorization Header 中，則從 Cookie 中提取
    if (!token) {
      const cookieHeader = ctx.getHeader('Cookie')
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim())
        const authCookie = cookies.find(c => c.startsWith('auth_token='))
        if (authCookie) {
          token = authCookie.substring('auth_token='.length)
        }
      }
    }

    // 如果仍然沒有 Token，重定向到登入
    if (!token) {
      return ctx.redirect('/login')
    }

    // 驗證 Token
    try {
      const result = await tokenValidator.validate(token)

      // 如果驗證失敗，重定向到登入
      if (!result) {
        return ctx.redirect('/login')
      }

      // 設定已認證的用戶 ID 到 Context
      ctx.set('authenticatedUserId', result.userId)
      ctx.set('authenticatedSessionId', result.sessionId)

      // 繼續執行下一個中間件
      return next()
    } catch (error) {
      // 驗證異常時重定向到登入
      return ctx.redirect('/login')
    }
  }
}
