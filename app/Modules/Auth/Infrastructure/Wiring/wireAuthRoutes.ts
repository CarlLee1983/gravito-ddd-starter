/**
 * @file wireAuthRoutes.ts
 * @description Auth 模組路由組裝
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：負責組裝表現層的路由（API + 頁面）。
 * - 職責：註冊 API 路由和 SSR 頁面路由
 */

import type { IRouteRegistrationContext } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import { AuthController } from '../../Presentation/Controllers/AuthController'
import { AuthPageController } from '../../Presentation/Controllers/AuthPageController'
import { registerAuthRoutes } from '../../Presentation/Routes/api'
import { registerPageRoutes } from '../../Presentation/Routes/pages'

/**
 * 組裝 Auth 模組的所有路由
 *
 * @param ctx - 框架無關的註冊用 Context（容器 + 建立路由器）
 */
export function wireAuthRoutes(ctx: IRouteRegistrationContext): void {
  const router = ctx.createModuleRouter()

  // 嘗試從容器取得 tokenValidator（用於頁面控制器檢查登入狀態）
  let tokenValidator: any = undefined
  try {
    tokenValidator = ctx.container.make('tokenValidator')
  } catch {
    // tokenValidator 可能不可用，/login 和 /register 會跳過重定向邏輯
  }

  // 建立 Page Controller 實例並註冊頁面路由
  const pageController = new AuthPageController(tokenValidator)
  registerPageRoutes(router, pageController)

  // 嘗試從容器取得依賴（用於 API 路由）
  let authController: AuthController
  try {
    authController = ctx.container.make('authController') as AuthController
    // 註冊 API 路由（JWT Guard 中間件透過字串解析）
    registerAuthRoutes(router, authController)
  } catch (error) {
    console.error('[wireAuthRoutes] Error: Failed to resolve authController', {
      message: (error as Error).message,
      hint: '可能缺少依賴: userProfileService, authMessages, 或其他 Auth 服務'
    })
    console.warn('[wireAuthRoutes] Warning: API routes skipped, but page routes registered')
  }
}
