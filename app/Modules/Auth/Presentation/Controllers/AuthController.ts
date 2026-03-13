/**
 * @file AuthController.ts
 * @description Auth 控制器
 *
 * 處理登入、註冊、登出和當前用戶查詢。
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IAuthMessages } from '@/Shared/Infrastructure/Ports/Messages/IAuthMessages'
import { LoginService } from '../../Application/Services/LoginService'
import { RegisterService } from '../../Application/Services/RegisterService'
import { LogoutService } from '../../Application/Services/LogoutService'
import { InvalidCredentialsException } from '@/Modules/Session/Domain/Exceptions/InvalidCredentialsException'
import type { IUserProfileService } from '@/Shared/Infrastructure/Ports/Auth/IUserProfileService'

/**
 * Auth 控制器
 *
 * 處理所有認證相關的 HTTP 請求（登入、註冊、登出、當前用戶）
 */
export class AuthController {
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
      const errorMessage = error instanceof Error ? error.message : '註冊失敗'

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
