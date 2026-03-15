/**
 * @file app/index.ts
 * @description Application Entry Point (Facade)
 *
 * 職責：統一的應用入口點，簡化 port 處理邏輯
 */

import { bootstrap as bootstrapApp } from './bootstrap'

/**
 * 建立並初始化 Gravito 應用程式
 *
 * Port 優先級：
 * 1. 環境變數 PORT
 * 2. 參數 port
 * 3. 預設值 3000
 *
 * @param port - 可選的連接埠覆寫（用於測試或自定義場景）
 * @returns 回傳初始化完成的 Gravito 核心實例 (PlanetCore)
 */
export async function createApp(port?: number): ReturnType<typeof bootstrapApp> {
  const resolvedPort = port ?? Number(process.env.PORT) || 3000
  return await bootstrapApp(resolvedPort)
}

export { bootstrap } from './bootstrap'
