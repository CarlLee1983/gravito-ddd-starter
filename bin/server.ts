/**
 * @file server.ts
 * @description 伺服器啟動入口 (Gravito + Hono)
 *
 * 職責：HTTP 伺服器啟動，委派應用初始化至 createApp()
 */

import { createApp } from '../app'

/**
 * 啟動 HTTP 伺服器
 *
 * Port 解析：與 createApp() 保持一致（環境變數 > 預設 3000）
 */
async function startServer() {
  try {
    // 解析 port（與 createApp 內部邏輯一致）
    const port = Number(process.env.PORT) || 3000

    // 應用初始化
    const core = await createApp(port)

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
