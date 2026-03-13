/**
 * @file AuthController.ts
 * @description 認證控制器
 *
 * 處理登入、登出和當前用戶查詢。
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { CreateSessionService } from '../../Application/Services/CreateSessionService'
import { RevokeSessionService } from '../../Application/Services/RevokeSessionService'
import { InvalidCredentialsException } from '../../Domain/Exceptions/InvalidCredentialsException'
import type { IUserProfileService } from '@/Shared/Infrastructure/Ports/Auth/IUserProfileService'

/**
 * 認證控制器
 *
 * 處理所有認證相關的 HTTP 請求。
 */
export class AuthController {
  /**
   * 建構子
   *
   * @param createSessionService - 建立 Session 服務
   * @param revokeSessionService - 撤銷 Session 服務
   * @param userProfileService - 用戶資料查詢服務
   */
  constructor(
    private createSessionService: CreateSessionService,
    private revokeSessionService: RevokeSessionService,
    private userProfileService: IUserProfileService
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
  async login(ctx: IHttpContext): Promise<any> {
    try {
      const { email, password } = await ctx.getJsonBody<{ email: string; password: string }>()

      // 基本驗證
      if (!email || !password) {
        return ctx.json(
          {
            success: false,
            message: '電子郵件和密碼為必填',
          },
          400
        )
      }

      // 執行登入
      const sessionDto = await this.createSessionService.execute(
        email,
        password
      )

      return ctx.json({
        success: true,
        data: sessionDto,
      })
    } catch (error) {
      if (error instanceof InvalidCredentialsException) {
        return ctx.json(
          {
            success: false,
            message: '無效的電子郵件或密碼',
          },
          401
        )
      }

      console.error('[AuthController.login] Error:', error)
      return ctx.json(
        {
          success: false,
          message: '登入失敗',
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
  async logout(ctx: IHttpContext): Promise<any> {
    try {
      const token = this.extractTokenFromHeader(ctx)
      if (!token) {
        return ctx.json(
          {
            success: false,
            message: '未提供 Token',
          },
          401
        )
      }

      await this.revokeSessionService.execute(token)

      return ctx.json({
        success: true,
        message: '登出成功',
      })
    } catch (error) {
      console.error('[AuthController.logout] Error:', error)
      return ctx.json(
        {
          success: false,
          message: '登出失敗',
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
   * @returns JSON 回應（用戶信息，排除密碼）
   */
  async me(ctx: IHttpContext): Promise<any> {
    try {
      const userId = ctx.get('authenticatedUserId') as string | undefined
      if (!userId) {
        return ctx.json(
          {
            success: false,
            message: '未授權',
          },
          401
        )
      }

      // 查詢用戶資料
      const userProfile = await this.userProfileService.findById(userId)
      if (!userProfile) {
        return ctx.json(
          {
            success: false,
            message: '用戶不存在',
          },
          404
        )
      }

      // 回傳用戶資訊
      return ctx.json({
        success: true,
        data: userProfile,
      })
    } catch (error) {
      console.error('[AuthController.me] Error:', error)
      return ctx.json(
        {
          success: false,
          message: '查詢失敗',
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
    return authHeader.slice(7) // 移除 'Bearer ' 前綴
  }
}
