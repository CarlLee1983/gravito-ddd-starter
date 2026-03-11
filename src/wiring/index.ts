/**
 * 接線層 (Wiring Layer)
 *
 * 核心責任：
 * 1. ORM 選擇：根據環境變數決定使用哪個 Repository 實現
 * 2. 模組註冊：將領域模組與具體實現綁定
 * 3. 控制器組裝：創建並連接控制器和應用服務
 * 4. 路由註冊：在框架上註冊所有模組路由
 *
 * 設計原則：
 * - 模組 Routes 只依賴 IModuleRouter（框架無關）
 * - 控制器只依賴 IHttpContext（框架無關）
 * - 此層負責創建適配器和控制器實例
 * - 框架特定的資源訪問在此層完成
 * - **ORM 選擇在此層發生**（Environment → Repository 實現）
 *
 * ORM 抽換方式（單一配置點）：
 *
 * ```bash
 * # 使用 in-memory Repository（開發/測試）
 * ORM=memory bun run dev
 *
 * # 使用 Drizzle Repository（需要 Database）
 * ORM=drizzle bun run start
 *
 * # 未來：使用其他 ORM
 * ORM=atlas bun run start
 * ORM=prisma bun run start
 * ```
 *
 * 架構優勢：
 * - ✅ 每個模組只需定義一個 ServiceProvider（不重複）
 * - ✅ 每個模組只需定義一對 Repository 實現（memory + db-backed）
 * - ✅ Wiring 層統一控制 ORM 選擇
 * - ✅ ServiceProvider 無需知道 ORM 選擇邏輯
 * - ✅ 單一環境變數即可切換全應用的 ORM
 */

import type { PlanetCore } from '@gravito/core'
import { registerUserRoutes } from '@/Modules/User/Presentation/Routes/api'
import { UserController } from '@/Modules/User/Presentation/Controllers/UserController'
import { registerHealthWithGravito } from '@/Shared/Infrastructure/Framework/GravitoHealthAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { getCurrentORM, getDatabaseAccess } from './RepositoryFactory'

// 核心導出（應用啟動時使用）
export { DatabaseAccessBuilder, createDatabaseAccess } from './DatabaseAccessBuilder'
export { getCurrentORM, getDatabaseAccess } from './RepositoryFactory'
export { initializeRegistry, getRegistry, resetRegistry } from './RepositoryRegistry'
export { createRepositoryFactory } from './RepositoryFactoryGenerator'

/**
 * 應用啟動時的 ORM 配置摘要
 *
 * 在 bootstrap 時打印當前的 ORM 選擇（用於診斷）
 */
export function printORMConfiguration(): void {
	const orm = getCurrentORM()
	console.log(`
╔════════════════════════════════════╗
║       ORM Configuration Report      ║
╠════════════════════════════════════╣
║ Current ORM: ${orm.padEnd(22)} ║
║ Repository Type: ${(orm === 'memory' ? 'In-Memory' : 'Database-Backed').padEnd(17)} ║
║ Environment Variable: ORM=${orm.padEnd(19)} ║
╚════════════════════════════════════╝
	`)
}

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
 * 註冊 User 模組（ORM 無關設計）
 *
 * 設計特點：
 * - Repository 來自 Container（由 ServiceProvider 在 bootstrap 時註冊）
 * - ServiceProvider 使用 RepositoryFactory 自動選擇實現
 * - Wiring 層只需從容器取出已配置的服務
 * - 完全不直接創建 Repository（讓 ServiceProvider 決定）
 *
 * 流程：
 * 1. bootstrap.ts 呼叫 UserServiceProvider.register()
 * 2. UserServiceProvider 使用 createRepository('user') 註冊
 * 3. Wiring 層從容器取出已完成配置的 repository
 * 4. Wiring 層組裝 UserController + registerUserRoutes
 */
export const registerUser = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)

	// 從容器中獲取服務（已由 UserServiceProvider 透過 RepositoryFactory 配置）
	const repository = core.container.make('userRepository') as any

	// 實例化控制器
	const controller = new UserController(repository)

	// 使用框架無關的路由註冊
	registerUserRoutes(router, controller)
}

/**
 * 註冊 Post 模組（ORM 無關設計）
 *
 * 與 User 模組相同的模式：
 * - ServiceProvider 透過 RepositoryFactory 選擇實現
 * - Wiring 層只組裝表現層
 *
 * 注意：此函式目前未在路由中使用，但展示完整的模式
 */
export const registerPost = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)

	// 從容器中獲取服務
	const repository = core.container.make('postRepository') as any

	// TODO: 實現 PostController 和路由
	// const controller = new PostController(repository)
	// registerPostRoutes(router, controller)

	console.log('✨ [Post] Module wired (routes not yet implemented)')
}
