/**
 * Route Registration
 *
 * Central registry for all module routes
 * Import and register routes from your modules here
 */

import type { PlanetCore } from '@gravito/core'

/**
 * Register all application routes
 *
 * @param core - Gravito core instance
 */
export async function registerRoutes(core: PlanetCore) {
  // Health check endpoint
  core.router.get('/health', async (ctx) => {
    return ctx.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    })
  })

  // API root
  core.router.get('/api', async (ctx) => {
    return ctx.json({
      success: true,
      message: 'Welcome to Gravito DDD API',
      version: '1.0.0',
      hint: 'Use the CLI to generate new modules: bun gravito module generate <name>',
    })
  })

  // TODO: Register module routes here
  // Example:
  // import { registerPaymentRoutes } from './Modules/Payment'
  // registerPaymentRoutes(core)

  console.log('✅ Routes registered')
}
