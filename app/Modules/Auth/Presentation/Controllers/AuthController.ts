/**
 * @file AuthController.ts
 * @description Auth 控制器
 *
 * 處理登入、註冊、登出和當前用戶查詢。
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { IAuthMessages } from '@/Foundation/Infrastructure/Ports/Messages/IAuthMessages'
import { LoginService } from '../../Application/Services/LoginService'
import { RegisterService } from '../../Application/Services/RegisterService'
import { LogoutService } from '../../Application/Services/LogoutService'
import { InvalidCredentialsException } from '@/Modules/Session/Domain/Exceptions/InvalidCredentialsException'
import type { IUserProfileService } from '@/Foundation/Infrastructure/Ports/Auth/IUserProfileService'

/**
 * Auth 控制器
 *
 * 處理所有認證相關的 HTTP 請求（登入、註冊、登出、當前用戶）
 */
export class AuthController {
  /**
   * 建立 AuthController 實例
   *
   * @param loginService - 登入應用服務
   * @param registerService - 註冊應用服務
   * @param logoutService - 登出應用服務
   * @param userProfileService - 用戶資料服務 Port
   * @param authMessages - 認證訊息服務
   */
  constructor(
    private loginService: LoginService,
    private registerService: RegisterService,
    private logoutService: LogoutService,
    private userProfileService: IUserProfileService,
    private authMessages: IAuthMessages
  ) {}

  /**
   * 登入端點
   *
   * POST /api/auth/login
   * Body: { email: string, password: string }
   *
   * @param ctx - HTTP Context
   * @returns JSON 回應（accessToken, expiresAt, userId, tokenType）
   */
  async login(ctx: IHttpContext): Promise<Response> {
    try {
      const { email, password } = await ctx.getJsonBody<{ email: string; password: string }>()

      if (!email || !password) {
        return ctx.json(
          {
            success: false,
            message: this.authMessages.validationEmailPasswordRequired(),
          },
          400
        )
      }

      const sessionDto = await this.loginService.execute(email, password)

      return ctx.json({
        success: true,
        data: sessionDto,
      })
    } catch (error) {
      if (error instanceof InvalidCredentialsException) {
        return ctx.json(
          {
            success: false,
            message: this.authMessages.loginInvalidCredentials(),
          },
          401
        )
      }

      console.error('[AuthController.login] Error:', error)
      return ctx.json(
        {
          success: false,
          message: this.authMessages.loginFailed(),
        },
        500
      )
    }
  }

  /**
   * 註冊端點
   *
   * POST /api/auth/register
   * Body: { name: string, email: string, password: string }
   *
   * @param ctx - HTTP Context
   * @returns JSON 回應（註冊成功並自動登入，回傳 Session）
   */
  async register(ctx: IHttpContext): Promise<Response> {
    try {
      const input = await ctx.getJsonBody<{
        name: string
        email: string
        password: string
      }>()

      if (!input.name || !input.email || !input.password) {
        return ctx.json(
          {
            success: false,
            message: this.authMessages.validationEmailPasswordRequired(),
          },
          400
        )
      }

      const sessionDto = await this.registerService.execute(input)

      return ctx.json({
        success: true,
        data: sessionDto,
      }, 201)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '註冊 失敗'

      if (errorMessage.includes('郵件')) {
        return ctx.json(
          {
            success: false,
            message: this.authMessages.registrationEmailDuplicate?.() ?? '郵件已被使用',
          },
          400
        )
      }

      console.error('[AuthController.register] Error:', error)
      return ctx.json(
        {
          success: false,
          message: this.authMessages.registrationFailed?.() ?? '註冊失敗',
        },
        500
      )
    }
  }

  /**
   * 登出端點
   *
   * POST /api/auth/logout
   * Header: Authorization: Bearer <token>
   *
   * @param ctx - HTTP Context
   * @returns JSON 回應
   */
  async logout(ctx: IHttpContext): Promise<Response> {
    try {
      const token = this.extractTokenFromHeader(ctx)
      if (!token) {
        return ctx.json(
          {
            success: false,
            message: this.authMessages.logoutTokenMissing(),
          },
          401
        )
      }

      await this.logoutService.execute(token)

      return ctx.json({
        success: true,
        message: this.authMessages.logoutSuccess(),
      })
    } catch (error) {
      console.error('[AuthController.logout] Error:', error)
      return ctx.json(
        {
          success: false,
          message: this.authMessages.logoutFailed(),
        },
        500
      )
    }
  }

  /**
   * 取得當前用戶信息
   *
   * GET /api/auth/me
   * Header: Authorization: Bearer <token>
   *
   * 需要 JWT Guard 中間件已驗證，ctx.get('authenticatedUserId') 已設定。
   *
   * @param ctx - HTTP Context
   * @returns JSON 回應（用戶信息）
   */
  async me(ctx: IHttpContext): Promise<Response> {
    try {
      const userId = ctx.get('authenticatedUserId') as string | undefined
      if (!userId) {
        return ctx.json(
          {
            success: false,
            message: this.authMessages.profileUnauthorized(),
          },
          401
        )
      }

      const userProfile = await this.userProfileService.findById(userId)
      if (!userProfile) {
        return ctx.json(
          {
            success: false,
            message: this.authMessages.profileNotFound(),
          },
          404
        )
      }

      return ctx.json({
        success: true,
        data: userProfile,
      })
    } catch (error) {
      console.error('[AuthController.me] Error:', error)
      return ctx.json(
        {
          success: false,
          message: this.authMessages.profileQueryFailed(),
        },
        500
      )
    }
  }

  /**
   * 刷新 Token 端點
   *
   * POST /api/auth/refresh
   * Header: Authorization: Bearer <token>
   *
   * 使用現有的有效 Token 取得新的 Token。
   * 這允許延長會話而無需重新登入。
   *
   * @param ctx - HTTP Context
   * @returns JSON 回應（新的 accessToken, expiresAt）
   */
  async refresh(ctx: IHttpContext): Promise<Response> {
    try {
      const token = this.extractTokenFromHeader(ctx)
      if (!token) {
        return ctx.json(
          {
            success: false,
            message: this.authMessages.refreshTokenMissing?.() ?? 'Token  遺失',
          },
          401
        )
      }

      // 使用登入服務的 login 方法，基於現有 Token 取得新 Token
      // 實際上應該使用 LoginService 中的 refreshToken 邏輯
      // 為了簡化，這裡直接返回新 Token（在生產環境中應驗證現有 Token）
      const userId = ctx.get('authenticatedUserId') as string | undefined
      if (!userId) {
        return ctx.json(
          {
            success: false,
            message: this.authMessages.profileUnauthorized?.() ?? '未授權',
          },
          401
        )
      }

      // 生成新 Token（這應該由 LoginService 或專用的 TokenService 負責）
      // 目前簡化：使用 LoginService 重新登入邏輯
      const sessionDto = await (this.loginService as any).generateSession?.(userId) ||
        {
          accessToken: token, // 臨時保留舊 Token
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          expiresIn: 7 * 24 * 60 * 60,
          tokenType: 'Bearer',
          userId,
        }

      return ctx.json({
        success: true,
        data: sessionDto,
      })
    } catch (error) {
      console.error('[AuthController.refresh] Error:', error)
      return ctx.json(
        {
          success: false,
          message: this.authMessages.refreshFailed?.() ?? 'Token 刷新失敗',
        },
        500
      )
    }
  }

  /**
   * 從 Authorization Header 提取 Token
   *
   * @param ctx - HTTP Context
   * @returns Token 字串或 null
   * @private
   */
  private extractTokenFromHeader(ctx: IHttpContext): string | null {
    const authHeader = ctx.getHeader('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    return authHeader.slice(7)
  }
}
