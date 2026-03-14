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
   * 顯示登入頁面。
   * 若已登入則重定向到 /dashboard，否則渲染 Auth/Login。
   */
  async showLoginPage(ctx: IHttpContext): Promise<Response> {
    if (await this.shouldRedirectToDashboard(ctx)) {
      return ctx.redirect('/dashboard')
    }
    return ctx.render('Auth/Login')
  }

  /**
   * 顯示註冊頁面。
   * 若已登入則重定向到 /dashboard，否則渲染 Auth/Register。
   */
  async showRegisterPage(ctx: IHttpContext): Promise<Response> {
    if (await this.shouldRedirectToDashboard(ctx)) {
      return ctx.redirect('/dashboard')
    }
    return ctx.render('Auth/Register')
  }

  /**
   * 顯示儀表板頁面。
   * 需由 Page Guard 中間件先行設定 authenticatedUserId；未登入時重定向到 /login。
   */
  async showDashboard(ctx: IHttpContext): Promise<Response> {
    const userId = ctx.get('authenticatedUserId') as string | undefined
    if (!userId) {
      return ctx.redirect('/login')
    }
    return ctx.render('Dashboard')
  }

  /**
   * 檢查是否已登入（Cookie 內有有效 Token），是則應重定向到 Dashboard。
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
   * 從 Cookie 中提取 auth_token。
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
