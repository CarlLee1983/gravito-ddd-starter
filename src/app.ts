/**
 * @file app.ts
 * @description 應用程式工廠 (Application Factory)
 *
 * 在 DDD 架構中的角色：
 * - 啟動層 (Bootstrap Layer)：封裝應用的建立與啟動邏輯。
 * - 職責：作為啟動流程的封裝層，負責環境參數整合並呼叫核心啟動程序 (bootstrap)。
 */

import bootstrap from './bootstrap'

/**
 * 建立並初始化 Gravito 應用程式
 *
 * 負責：
 * 1. 從配置取得連接埠號
 * 2. 調用 bootstrap 初始化應用
 * 3. 返回已初始化的 PlanetCore 實例
 *
 * @returns 回傳初始化完成的 Gravito 核心實例 (PlanetCore)
 */
export async function createApp() {
	// 從環境變數或預設值取得連接埠
	const port = (process.env.PORT as unknown as number) || 3000

	// 執行完整的啟動流程
	const core = await bootstrap(port)

	return core
}
