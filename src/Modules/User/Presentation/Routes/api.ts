/**
 * User API Routes
 */

import type { PlanetCore } from '@gravito/core'
import { UserController } from '../Controllers/UserController'

/**
 * Register all user routes
 *
 * @param core - Gravito core instance
 */
export async function registerUserRoutes(core: PlanetCore) {
  const controller = new UserController()

  core.router.get('/api/users', (ctx) => controller.index(ctx))
  core.router.get('/api/users/:id', (ctx) => controller.show(ctx))
  core.router.post('/api/users', (ctx) => controller.store(ctx))
}
