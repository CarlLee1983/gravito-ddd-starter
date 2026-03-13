/**
 * @file api.ts
 * @description Auth 模組 API 路由
 */

import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { AuthController } from '../Controllers/AuthController'

/**
 * 註冊 Auth API 路由
 *
 * @param router - 模組路由器
 * @param authController - Auth 控制器實例
 */
export function registerAuthRoutes(router: IModuleRouter, authController: AuthController): void {
  // 登入路由
  router.post('/api/auth/login', [], (ctx: IHttpContext) => authController.login(ctx))

  // 註冊路由
  router.post('/api/auth/register', [], (ctx: IHttpContext) => authController.register(ctx))

  // 登出路由（需 JWT Guard）
  router.post('/api/auth/logout', [], (ctx: IHttpContext) => authController.logout(ctx))

  // 取得當前用戶路由（需 JWT Guard）
  router.get('/api/auth/me', [], (ctx: IHttpContext) => authController.me(ctx))
}
