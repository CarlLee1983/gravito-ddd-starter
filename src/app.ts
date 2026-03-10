/**
 * Application Bootstrap
 */

import { PlanetCore, defineConfig } from '@gravito/core'
import { buildConfig } from '../config/index'
import { registerRoutes } from './routes'
import { HealthServiceProvider } from './Modules/Health/Infrastructure/Providers/HealthServiceProvider'
import { UserServiceProvider } from './Modules/User/Infrastructure/Providers/UserServiceProvider'

export async function createApp() {
  // Build configuration
  const configObj = buildConfig()

  // Initialize Gravito core
  const config = defineConfig({
    config: configObj,
  })

  // Create core instance
  const core = new PlanetCore(config)

  // Register all module providers (in order of dependencies)
  // Health module has no dependencies, register first
  core.register(new HealthServiceProvider())

  // User module depends on the core being set up
  core.register(new UserServiceProvider())

  // Bootstrap all registered providers
  await core.bootstrap()

  // Register all routes
  await registerRoutes(core)

  return core
}
