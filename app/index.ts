/**
 * @file app/index.ts
 * @description Application Entry Point (Facade)
 * 
 * Role: Bootstrap Layer
 */

import { bootstrap } from './bootstrap'

/**
 * 建立並初始化 Gravito 應用程式
 * 
 * @returns 回傳初始化完成的 Gravito 核心實例 (PlanetCore)
 */
export async function createApp() {
  const port = Number(process.env.PORT) || 3000
  return await bootstrap(port)
}

export { bootstrap } from './bootstrap'
