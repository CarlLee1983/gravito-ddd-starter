/**
 * @file server.ts
 * @description 伺服器啟動入口 (Gravito + Hono)
 */

import { bootstrap } from '../app/bootstrap'

/**
 * 啟動 HTTP 伺服器
 */
async function startServer() {
  const port = Number(process.env.PORT) || 3000

  try {
    const core = await bootstrap(port)

    // PlanetCore 會自動啟動 Hono 應用
    // 在 Bun 環境中，使用 Bun.serve() 來啟動伺服器
    Bun.serve({
      port,
      fetch: (core.app as any).fetch.bind(core.app),
      hostname: '0.0.0.0',
    })

    // 伺服器啟動成功通知
    console.log(`
🚀 Gravito Server is running!
----------------------------------
Environment: ${process.env.NODE_ENV || 'development'}
Port:        ${port}
URL:         http://localhost:${port}
----------------------------------
    `)
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// 執行
startServer()
