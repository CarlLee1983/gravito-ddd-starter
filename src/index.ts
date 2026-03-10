/**
 * Gravito DDD Starter Application
 *
 * Entry point for the Gravito DDD application
 * Initializes the framework and starts the HTTP server
 */

import { createApp } from './app'

async function bootstrap() {
  const core = await createApp()
  const configObj = core.config.all()

  // Start server using liftoff
  const server = core.liftoff(configObj.PORT as number)

  console.log(`
╔════════════════════════════════════════════╗
║     🚀 Gravito DDD Starter Running          ║
╚════════════════════════════════════════════╝

Environment: ${process.env.APP_ENV || 'development'}
Server:      http://localhost:${configObj.PORT}

📚 Docs:     https://github.com/gravito-framework/gravito
🔧 Next:     Module generated: User
`)

  return server
}

const server = await bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error)
  process.exit(1)
})

export default server
