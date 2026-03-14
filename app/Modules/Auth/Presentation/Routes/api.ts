/**
 * @file api.ts
 * @description Auth 模組 API 路由
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { AuthController } from '../Controllers/AuthController'

/**
 * 註冊 Auth API 路由
 *
 * @param router - 模組路由器
 * @param authController - Auth 控制器實例
 * @param jwtGuardMiddleware - JWT Guard 中間件
 */
export function registerAuthRoutes(
  router: IModuleRouter,
  authController: AuthController,
  jwtGuardMiddleware?: any
): void {
  // 登入路由
  router.post('/api/auth/login', [], (ctx: IHttpContext) => authController.login(ctx))

  // 註冊路由
  router.post('/api/auth/register', [], (ctx: IHttpContext) => authController.register(ctx))

  // 登出路由（需 JWT Guard）
  const logoutMiddlewares = jwtGuardMiddleware ? [jwtGuardMiddleware] : []
  router.post('/api/auth/logout', logoutMiddlewares, (ctx: IHttpContext) => authController.logout(ctx))

  // 取得當前用戶路由（需 JWT Guard）
  const meMiddlewares = jwtGuardMiddleware ? [jwtGuardMiddleware] : []
  router.get('/api/auth/me', meMiddlewares, (ctx: IHttpContext) => authController.me(ctx))

  // 刷新 Token 路由（需 JWT Guard）
  const refreshMiddlewares = jwtGuardMiddleware ? [jwtGuardMiddleware] : []
  router.post('/api/auth/refresh', refreshMiddlewares, (ctx: IHttpContext) => authController.refresh(ctx))
}
