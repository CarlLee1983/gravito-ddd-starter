/**
 * @file index.ts
 * @description 系統入口點 (System Entry Point)
 *
 * 在 DDD 架構中的角色：
 * - 啟動層 (Bootstrap Layer)：整個應用的硬體與作業系統接觸面。
 * - 職責：啟動初始化流程，掛載 HTTP 伺服器，並提供系統啟動時的視覺化反饋。
 *
 * 核心功能：
 * 1. 調用 createApp() 初始化應用
 * 2. 啟動 HTTP 伺服器
 * 3. 顯示啟動成功訊息和可用端點
 * 4. 處理啟動失敗的例外
 */

import { createApp } from './app'

/**
 * 啟動應用程式服務並顯示歡迎資訊
 *
 * @returns 啟動後的伺服器實例
 */
async function start() {
	// 初始化應用（觸發完整的 DDD 啟動流程）
	const core = await createApp()

	// 啟動 HTTP 伺服器
	const port = (core.config.get<number>('PORT') ?? 3000) as number
	const baseUrl = `http://localhost:${port}`
	const server = core.liftoff(port)

	// 顯示啟動成功訊息與系統狀態報告
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
     open docs/MODULE_GENERATION_WITH_ADAPTERS.md

  3. Create your first module:
     bun scripts/generate-module.ts MyFeature [--redis] [--cache] [--db]

  4. Run tests:
     bun test

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 Resources:
   - Gravito Docs:         https://github.com/gravito-framework/gravito
   - DDD Guide:            https://domaindriven.org/
   - Framework-Agnostic:   docs/ADAPTER_INFRASTRUCTURE_GUIDE.md
   - Module Generation:    docs/MODULE_GENERATION_WITH_ADAPTERS.md
   - Bun Docs:             https://bun.sh/docs

🐛 Having trouble? Check docs/TROUBLESHOOTING.md for common issues.
`)

	return server
}

// 執行全局啟動流程
const server = await start().catch((error) => {
	console.error('❌ Application startup failed:', error)
	process.exit(1)
})

export default server
