/**
 * @file wireAuthRoutes.ts
 * @description Auth 模組路由組裝
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：負責組裝表現層的路由（API + 頁面）。
 * - 職責：註冊 API 路由和 SSR 頁面路由
 */

import type { IRouteRegistrationContext } from '@/Shared/Infrastructure/Wiring/ModuleDefinition'
import { AuthController } from '../../Presentation/Controllers/AuthController'
import { registerAuthRoutes } from '../../Presentation/Routes/api'
import { registerPageRoutes } from '../../Presentation/Routes/pages'

/**
 * 組裝 Auth 模組的所有路由
 *
 * @param ctx - 框架無關的註冊用 Context（容器 + 建立路由器）
 */
export function wireAuthRoutes(ctx: IRouteRegistrationContext): void {
  const router = ctx.createModuleRouter()

  // 嘗試從容器取得依賴
  let authController: AuthController
  try {
    authController = ctx.container.make('authController') as AuthController
  } catch (error) {
    console.warn('[wireAuthRoutes] Warning: authController not ready, skipping route registration')
    return
  }

  // 註冊 API 路由（/api/auth/*)
  registerAuthRoutes(router, authController)

  // 註冊頁面路由（/, /login, /register, /dashboard）
  registerPageRoutes(router)
}
