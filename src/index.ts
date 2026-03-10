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

  const port = configObj.PORT as number
  const baseUrl = `http://localhost:${port}`

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          🚀 Gravito DDD Starter - Running                      ║
╚════════════════════════════════════════════════════════════════╝

✨ Server started successfully!

📍 Base URL:       ${baseUrl}
🔧 Environment:    ${process.env.APP_ENV || 'development'}
🗂️  Database:       ${process.env.ENABLE_DB !== 'false' ? 'Enabled ✓' : 'Disabled ✗'}
💾 Cache Driver:   ${process.env.CACHE_DRIVER || 'memory'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Available Endpoints:

  Health Check:
    curl ${baseUrl}/health

  API Root:
    curl ${baseUrl}/api

  User Module (Example):
    curl ${baseUrl}/api/users

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Next Steps:

  1. Review the module structure:
     open src/Modules/User/

  2. Read the documentation:
     open docs/ARCHITECTURE.md
     open docs/MODULE_GUIDE.md

  3. Create your first module:
     bun gravito module generate Product --ddd-type simple

  4. Run tests:
     bun test

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 Resources:
   - Gravito Docs: https://github.com/gravito-framework/gravito
   - DDD Guide:    https://domaindriven.org/
   - Bun Docs:     https://bun.sh/docs

🐛 Having trouble? Check TROUBLESHOOTING.md for common issues.
`)

  return server
}

const server = await bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error)
  process.exit(1)
})

export default server
