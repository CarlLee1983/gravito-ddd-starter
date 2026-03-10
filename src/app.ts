/**
 * Application Bootstrap
 */

import { PlanetCore, defineConfig } from '@gravito/core'
import { buildConfig } from '../config/index'
import { registerRoutes } from './routes'
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

  // Register all module providers
  core.register(new UserServiceProvider())

  // Bootstrap all registered providers
  await core.bootstrap()

  // Register all routes
  await registerRoutes(core)

  return core
}
