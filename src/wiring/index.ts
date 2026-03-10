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

import type { PlanetCore } from '@gravito/core'
import { registerUserRoutes } from '@/Modules/User/Presentation/Routes/api'
import { UserController } from '@/Modules/User/Presentation/Controllers/UserController'
import { registerHealthWithGravito } from '@/adapters/GravitoHealthAdapter'
import { createGravitoModuleRouter } from '@/adapters/GravitoModuleRouter'

/**
 * 註冊 Health 模組（透過完整 Gravito 適配器）
 *
 * 適配器負責：
 * - 從 PlanetCore 提取 Redis/Cache 服務
 * - 適配為框架無關的 IRedisService/ICacheService
 * - 組裝所有依賴並註冊路由
 */
export const registerHealth = (core: PlanetCore): void => {
	registerHealthWithGravito(core)
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
