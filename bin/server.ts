/**
 * @file server.ts
 * @description 伺服器啟動入口 (AdonisJS v6 Style)
 */

import { bootstrap } from '../app/bootstrap'

/**
 * 啟動 HTTP 伺服器
 */
async function startServer() {
  const port = Number(process.env.PORT) || 3000
  
  try {
    const core = await bootstrap(port)
    
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
