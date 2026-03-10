/**
 * Route Registration
 *
 * Central registry for all module routes
 * Import and register routes from your modules here
 */

import type { PlanetCore } from '@gravito/core'
import { registerHealthRoutes } from './Modules/Health/Presentation/Routes/health.routes'
import { registerUserRoutes } from './Modules/User/Presentation/Routes/api'

/**
 * Register all application routes
 *
 * @param core - Gravito core instance
 */
export async function registerRoutes(core: PlanetCore) {
  // API root
  core.router.get('/api', async (ctx) => {
    return ctx.json({
      success: true,
      message: 'Welcome to Gravito DDD API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        healthHistory: '/health/history',
        users: '/api/users'
      }
    })
  })

  // Register module routes
  // Health module (system health checks)
  await registerHealthRoutes(core)

  // User module (example DDD module)
  await registerUserRoutes(core)

  console.log('✅ Routes registered')
}
