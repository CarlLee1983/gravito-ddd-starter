/**
 * @file GravitoAuthRouter.ts
 * @description Gravito Auth 路由適配器
 *
 * 實現 IAuthRouter 介面，支持帶 JWT Guard 的路由註冊。
 * 自動套用 JWT Guard 中間件到受保護的路由。
 */

import type { PlanetCore } from '@gravito/core'
import type { ITokenValidator } from '@/Shared/Infrastructure/Ports/Auth/ITokenValidator'
import { createJwtGuardMiddleware } from '@/Shared/Presentation/Middlewares/JwtGuardMiddleware'
import { fromGravitoContext } from './GravitoHttpContextAdapter'
import { exceptionHandlingMiddleware } from '@/Shared/Presentation/Middlewares/ExceptionHandlingMiddleware'
import type { IAuthRouter, AuthRouteHandler } from '@/Shared/Presentation/IAuthRouter'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

/**
 * 執行 Middleware 管線（洋蔥模型）
 */
function runPipeline(
  middlewares: Middleware[],
  handler: AuthRouteHandler
): (ctx: any) => Promise<Response> {
  return (ctx: any) => {
    const adaptedCtx = fromGravitoContext(ctx)
    let index = -1
    const dispatch = (i: number): Promise<Response> => {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'))
      }
      index = i
      if (i === middlewares.length) {
        return handler(adaptedCtx)
      }
      return middlewares[i](adaptedCtx, () => dispatch(i + 1))
    }
    return dispatch(0)
  }
}

/**
 * 建立 Gravito Auth 路由適配器
 *
 * @param core - Gravito PlanetCore 實例
 * @param tokenValidator - Token 驗證器（Port 介面實現）
 * @returns 實作 IAuthRouter 介面的物件
 *
 * 現在依賴於 ITokenValidator Port，而非具體的 ValidateSessionService。
 * 這允許任何實現此 Port 的認證方案（Session、OAuth、SSO 等）都能正常工作。
 */
export function createGravitoAuthRouter(
  core: PlanetCore,
  tokenValidator: ITokenValidator
): IAuthRouter {
  const jwtGuard = createJwtGuardMiddleware(tokenValidator)

  return {
    /**
     * 公開 POST 路由
     */
    post(path: string, middlewares: any[] | AuthRouteHandler = [], handler?: AuthRouteHandler): void {
      const h = handler ?? (Array.isArray(middlewares) && middlewares.length === 0 ? (middlewares as any)[0] : middlewares as AuthRouteHandler)
      const mws = Array.isArray(middlewares) && middlewares.length > 0 && typeof middlewares[0] === 'function' ? middlewares : []

      const pipeline = runPipeline(mws, h as AuthRouteHandler)
      core.router.post(path, pipeline)
    },

    /**
     * 公開 GET 路由
     */
    get(path: string, middlewares: any[] | AuthRouteHandler = [], handler?: AuthRouteHandler): void {
      const h = handler ?? (Array.isArray(middlewares) && middlewares.length === 0 ? (middlewares as any)[0] : middlewares as AuthRouteHandler)
      const mws = Array.isArray(middlewares) && middlewares.length > 0 && typeof middlewares[0] === 'function' ? middlewares : []

      const pipeline = runPipeline(mws, h as AuthRouteHandler)
      core.router.get(path, pipeline)
    },

    /**
     * 受保護 POST 路由（需要 JWT）
     *
     * 自動套用 JWT Guard 和異常處理中間件。
     */
    postWithGuard(path: string, middlewares: any[] | AuthRouteHandler = [], handler?: AuthRouteHandler): void {
      const h = handler ?? (Array.isArray(middlewares) && middlewares.length === 0 ? (middlewares as any)[0] : middlewares as AuthRouteHandler)
      const mws = Array.isArray(middlewares) && middlewares.length > 0 && typeof middlewares[0] === 'function' ? middlewares : []

      // 組合中間件：JWT Guard + 傳入的中間件 + 異常處理
      const allMiddlewares = [jwtGuard, ...mws, exceptionHandlingMiddleware]

      const pipeline = runPipeline(allMiddlewares, h as AuthRouteHandler)
      core.router.post(path, pipeline)
    },

    /**
     * 受保護 GET 路由（需要 JWT）
     *
     * 自動套用 JWT Guard 和異常處理中間件。
     */
    getWithGuard(path: string, middlewares: any[] | AuthRouteHandler = [], handler?: AuthRouteHandler): void {
      const h = handler ?? (Array.isArray(middlewares) && middlewares.length === 0 ? (middlewares as any)[0] : middlewares as AuthRouteHandler)
      const mws = Array.isArray(middlewares) && middlewares.length > 0 && typeof middlewares[0] === 'function' ? middlewares : []

      // 組合中間件：JWT Guard + 傳入的中間件 + 異常處理
      const allMiddlewares = [jwtGuard, ...mws, exceptionHandlingMiddleware]

      const pipeline = runPipeline(allMiddlewares, h as AuthRouteHandler)
      core.router.get(path, pipeline)
    },
  }
}
