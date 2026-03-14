/**
 * @file JwtGuardMiddleware.ts
 * @description JWT Guard 中間件
 *
 * 驗證 Bearer Token 並設定 authenticatedUserId 到 ctx 中。
 */

import type { ITokenValidator } from '@/Foundation/Infrastructure/Ports/Auth/ITokenValidator'
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'

/**
 * 創建 JWT Guard 中間件
 *
 * @param tokenValidator - Token 驗證器（Port 介面實現）
 * @returns 中間件函數
 *
 * 中間件只依賴於 ITokenValidator Port，不知道底層使用什麼認證方案。
 * 這允許我們在將來輕鬆替換認證實現（Session → OAuth → SSO）
 * 而無需修改中間件代碼。
 */
export function createJwtGuardMiddleware(
  tokenValidator: ITokenValidator
): (ctx: IHttpContext, next: () => Promise<any>) => Promise<Response> {
  return async (ctx: IHttpContext, next: () => Promise<any>) => {
    // 提取 Token
    const authHeader = ctx.getHeader('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ctx.json(
        {
          success: false,
          message: '未授權',
        },
        401
      )
    }

    const token = authHeader.slice(7) // 移除 'Bearer ' 前綴

    // 驗證 Token（透過 Port 介面）
    try {
      const result = await tokenValidator.validate(token)

      // 驗證失敗
      if (!result) {
        return ctx.json(
          {
            success: false,
            message: '無效或過期的 Token',
          },
          401
        )
      }

      // 設定已認證的用戶 ID 和 Session ID 到 Context
      ctx.set('authenticatedUserId', result.userId)
      ctx.set('authenticatedSessionId', result.sessionId)

      // 繼續執行下一個中間件
      return next()
    } catch (error) {
      // 捕捉任何驗證過程中的異常
      return ctx.json(
        {
          success: false,
          message: '認證失敗',
        },
        401
      )
    }
  }
}
