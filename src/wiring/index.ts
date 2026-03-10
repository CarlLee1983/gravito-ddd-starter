/**
 * 接線層 (Wiring Layer)
 *
 * 將「領域模組註冊」與「具體框架實作」綁定在此處。
 *
 * 設計原則：
 * - 模組 Routes 只依賴 IModuleRouter（框架無關）
 * - 控制器只依賴 IHttpContext（框架無關）
 * - Wiring 層負責創建適配器和控制器實例
 * - 框架特定的資源訪問在 Wiring 層完成
 *
 * 抽換框架時：
 * 1. 修改 adapters/ 中的適配器實現
 * 2. 修改 wiring/index.ts 中的資源獲取方式
 * 3. Routes 和 Controllers 無需修改
 */

import type { PlanetCore, GravitoContext } from '@gravito/core'
import { fromGravitoContext } from '@/Shared/Presentation/IHttpContext'
import { createGravitoModuleRouter } from '@/adapters/GravitoModuleRouter'
import { registerHealthRoutes } from '@/Modules/Health/Presentation/Routes/health.routes'
import { HealthController } from '@/Modules/Health/Presentation/Controllers/HealthController'
import { registerUserRoutes } from '@/Modules/User/Presentation/Routes/api'
import { UserController } from '@/Modules/User/Presentation/Controllers/UserController'

/**
 * 註冊 Health 模組（目前綁定 Gravito 實作）
 *
 * 處理 Health 模組所需的特殊邏輯：
 * - 需要訪問 db、redis、cache 等 Gravito 資源
 * - 使用自定義路由註冊以完全控制 context 注入
 */
export const registerHealth = (core: PlanetCore): void => {
	// 從容器中獲取應用服務
	const service = core.container.make('healthCheckService') as any

	// 實例化控制器
	const controller = new HealthController(service)

	// 直接使用 Gravito 原生路由以完全控制資源注入
	// 這是必要的，因為 Health 模組需要訪問框架資源

	// GET /health
	core.router.get('/health', (ctx: GravitoContext) => {
		// 將 Gravito context 轉換為框架無關的 IHttpContext
		const httpContext = fromGravitoContext(ctx)

		// 注入 Gravito 特定的資源
		const db = (core as any).db
		const redis = (core as any).redis
		const cache = (core as any).cache

		// 將資源存儲在 context 中以供控制器訪問
		httpContext.set('__db', db)
		httpContext.set('__redis', redis)
		httpContext.set('__cache', cache)

		return controller.check(httpContext)
	})

	// GET /health/history
	core.router.get('/health/history', (ctx: GravitoContext) => {
		const httpContext = fromGravitoContext(ctx)
		return controller.history(httpContext)
	})
}

/**
 * 註冊 User 模組（目前綁定 Gravito 實作）
 *
 * User 模組是純淨的 DDD 實現，不依賴框架資源
 * 可以使用框架無關的 IModuleRouter 抽象
 */
export const registerUser = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)

	// 從容器中獲取服務
	const repository = core.container.make('userRepository') as any
	const createUserHandler = core.container.make('createUserHandler') as any

	// 實例化控制器
	const controller = new UserController(repository, createUserHandler)

	// 使用框架無關的路由註冊
	registerUserRoutes(router, controller)
}
