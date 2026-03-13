/**
 * @file api.ts
 * @description 認證模組路由定義
 *
 * 定義認證相關的路由端點。
 * 登出和取得當前用戶需要 JWT Guard 保護（由 Wiring 層添加）。
 */

import type { IAuthRouter } from '@/Shared/Presentation/IAuthRouter'
import type { AuthController } from '../Controllers/AuthController'

/**
 * 註冊認證模組的所有路由
 *
 * @param router - 認證路由介面（支持 withGuard）
 * @param controller - 已組裝的認證控制器
 */
export function registerAuthRoutes(
  router: IAuthRouter,
  controller: AuthController
): void {
  /**
   * POST /api/auth/login
   * 公開端點 - 用戶登入
   * 需要提交 email 和 password
   */
  router.post('/api/auth/login', (ctx: any) =>
    controller.login(ctx)
  )

  /**
   * POST /api/auth/logout
   * 受保護端點 - 需要有效的 JWT Token
   * 撤銷當前 Session
   */
  router.postWithGuard('/api/auth/logout', (ctx: any) =>
    controller.logout(ctx)
  )

  /**
   * GET /api/auth/me
   * 受保護端點 - 需要有效的 JWT Token
   * 回傳當前認證用戶的信息
   */
  router.getWithGuard('/api/auth/me', (ctx: any) =>
    controller.me(ctx)
  )
}
