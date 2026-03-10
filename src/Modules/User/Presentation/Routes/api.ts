/**
 * User API Routes
 * 從容器注入 Controller，而不是直接創建
 */

import type { PlanetCore, GravitoContext } from '@gravito/core'
import type { UserController } from '../Controllers/UserController'

/**
 * Register all user routes
 *
 * @param core - Gravito core instance
 */
export async function registerUserRoutes(core: PlanetCore) {
  /**
   * 中間件：從容器注入 controller
   * 這樣每個請求都會從容器中獲取依賴注入的 controller
   */
  const getController = (ctx: GravitoContext): UserController => {
    return ctx.get('core').container.make('userController') as UserController
  }

  /**
   * GET /api/users
   * 列出所有用戶
   */
  core.router.get('/api/users', (ctx: GravitoContext) => {
    const controller = getController(ctx)
    return controller.index(ctx)
  })

  /**
   * GET /api/users/:id
   * 獲取特定用戶
   */
  core.router.get('/api/users/:id', (ctx: GravitoContext) => {
    const controller = getController(ctx)
    return controller.show(ctx)
  })

  /**
   * POST /api/users
   * 創建新用戶
   */
  core.router.post('/api/users', (ctx: GravitoContext) => {
    const controller = getController(ctx)
    return controller.store(ctx)
  })
}
