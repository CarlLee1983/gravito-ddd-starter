/**
 * @file AuthPageController.ts
 * @description Auth 頁面控制器
 *
 * 處理 SSR 頁面請求：登入、註冊、儀表板。
 * 封裝「已登入則重定向 / 否則顯示表單」等表現層邏輯。
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { ITokenValidator } from '@/Foundation/Infrastructure/Ports/Auth/ITokenValidator'

/**
 * Auth 頁面控制器
 *
 * 負責登入頁、註冊頁、儀表板頁的顯示與重定向邏輯。
 */
export class AuthPageController {
  constructor(private readonly tokenValidator?: ITokenValidator | null) {}

  /**
   * 顯示登入頁面
   *
   * @param ctx - HTTP 上下文
   * @returns 響應物件，若已登入則重定向到儀表板，否則渲染登入頁面
   */
  async showLoginPage(ctx: IHttpContext): Promise<Response> {
    if (await this.shouldRedirectToDashboard(ctx)) {
      return ctx.redirect('/dashboard')
    }
    return ctx.render('Auth/Login')
  }

  /**
   * 顯示註冊頁面
   *
   * @param ctx - HTTP 上下文
   * @returns 響應物件，若已登入則重定向到儀表板，否則渲染註冊頁面
   */
  async showRegisterPage(ctx: IHttpContext): Promise<Response> {
    if (await this.shouldRedirectToDashboard(ctx)) {
      return ctx.redirect('/dashboard')
    }
    return ctx.render('Auth/Register')
  }

  /**
   * 顯示儀表板頁面
   *
   * @param ctx - HTTP 上下文
   * @returns 響應物件，渲染儀表板頁面，未登入則重定向到登入頁面
   */
  async showDashboard(ctx: IHttpContext): Promise<Response> {
    const userId = ctx.get('authenticatedUserId') as string | undefined
    if (!userId) {
      return ctx.redirect('/login')
    }
    return ctx.render('Dashboard')
  }

  /**
   * 檢查是否應重定向到儀表板
   *
   * @param ctx - HTTP 上下文
   * @returns 是否應重定向
   */
  private async shouldRedirectToDashboard(ctx: IHttpContext): Promise<boolean> {
    if (!this.tokenValidator) return false

    const token = this.getTokenFromCookie(ctx)
    if (!token) return false

    try {
      const result = await this.tokenValidator.validate(token)
      return result != null
    } catch {
      return false
    }
  }

  /**
   * 從 Cookie 獲取 Token
   *
   * @param ctx - HTTP 上下文
   * @returns Token 字串或 null
   */
  private getTokenFromCookie(ctx: IHttpContext): string | null {
    const cookieHeader = ctx.getHeader('Cookie')
    if (!cookieHeader) return null

    const cookies = cookieHeader.split(';').map((c) => c.trim())
    const authCookie = cookies.find((c) => c.startsWith('auth_token='))
    if (!authCookie) return null

    return authCookie.substring('auth_token='.length) || null
  }
}
