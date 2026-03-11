/**
 * @file index.ts
 * @description 接線層 (Wiring Layer) 入口
 *
 * 在 DDD 架構中的角色：
 * - 接線層 (Wiring Layer)：負責將各個獨立的模組（如 Domain, Application, Presentation）與具體的基礎設施實現組裝在一起。
 * - 職責：處理跨模組的依賴組裝、路由註冊以及與核心框架的適配。
 *
 * 核心責任：
 * 1. ORM 選擇：根據環境變數決定使用哪個 Repository 實現
 * 2. 模組註冊：將領域模組與具體實現綁定
 * 3. 控制器組裝：建立並連接控制器和應用服務
 * 4. 路由註冊：在框架上註冊所有模組路由
 *
 * 設計原則：
 * - 模組 Routes 只依賴 IModuleRouter（框架無關）
 * - 控制器只依賴 IHttpContext（框架無關）
 * - 此層負責建立適配器和控制器實例
 * - 框架特定的資源存取在此層完成
 * - **ORM 選擇在此層發生**（Environment → Repository 實現）
 *
 * 架構優勢：
 * - ✅ 每個模組只需定義一個 ServiceProvider
 * - ✅ Wiring 層統一控制 ORM 選擇
 * - ✅ 透過適配器隔離具體框架（如 Gravito）與模組邏輯
 */

import type { PlanetCore } from '@gravito/core'
import { registerUserRoutes } from '@/Modules/User/Presentation/Routes/api'
import { UserController } from '@/Modules/User/Presentation/Controllers/UserController'
import { registerHealthWithGravito } from '@/Shared/Infrastructure/Framework/GravitoHealthAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { getCurrentORM, getDatabaseAccess } from './RepositoryFactory'

// 核心導出（供應用啟動與初始化使用）
export { DatabaseAccessBuilder, createDatabaseAccess } from './DatabaseAccessBuilder'
export { getCurrentORM, getDatabaseAccess } from './RepositoryFactory'
export { initializeRegistry, getRegistry, resetRegistry } from './RepositoryRegistry'
export { createRepositoryFactory } from './RepositoryFactoryGenerator'

/**
 * 列印應用啟動時的 ORM 配置摘要
 * 用於開發與運行環境中的診斷，確認當前使用的持久化技術。
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
 * 註冊健康檢查 (Health) 模組
 *
 * 透過 Gravito 適配器將健康檢查功能整合進框架中。
 * @param core - Gravito 核心實例
 */
export const registerHealth = (core: PlanetCore): void => {
	registerHealthWithGravito(core)
}

/**
 * 註冊用戶 (User) 模組
 *
 * 流程：
 * 1. 建立框架適配的路由實例。
 * 2. 從容器獲取已配置好的 Repository (ServiceProvider 已處理 ORM 選擇)。
 * 3. 組裝 Controller 並註冊路由映射。
 *
 * @param core - Gravito 核心實例
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
 * 註冊文章 (Post) 模組（示範架構設計）
 *
 * 遵循與 User 模組相同的組裝模式。
 * @param core - Gravito 核心實例
 */
export const registerPost = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)

	// 從容器中獲取服務
	const repository = core.container.make('postRepository') as any

	// TODO: 實現 PostController 和路由註冊
	// const controller = new PostController(repository)
	// registerPostRoutes(router, controller)

	console.log('✨ [Post] Module wired (routes not yet implemented)')
}
