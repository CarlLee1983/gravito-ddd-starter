/**
 * Gravito DDD Starter Application
 *
 * Entry point for the Gravito DDD application
 * Initializes the framework and starts the HTTP server
 */

import { PlanetCore, defineConfig } from '@gravito/core'
import { buildConfig } from '../config/index'
import { registerRoutes } from './routes'

async function bootstrap() {
  // Build configuration
  const configObj = buildConfig()

  // Initialize Gravito core
  const config = defineConfig(configObj)
  const core = new PlanetCore(config)

  // Register all routes
  await registerRoutes(core)

  // Start server
  await core.listen()

  console.log(`
╔════════════════════════════════════════════╗
║     🚀 Gravito DDD Starter Running          ║
╚════════════════════════════════════════════╝

Environment: ${process.env.APP_ENV || 'development'}
Server:      http://localhost:${configObj.PORT}

📚 Docs:     https://github.com/gravito-framework/gravito
🔧 Next:     bun add -D @cmg/scaffold-cli
             bun gravito module generate <ModuleName>
`)
}

bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error)
  process.exit(1)
})
