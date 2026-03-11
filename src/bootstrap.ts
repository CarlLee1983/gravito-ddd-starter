/**
 * DDD 應用啟動流程 (Bootstrap)
 *
 * 責任：
 * 1. 載入並建立配置 (buildConfig)
 * 2. 初始化 RepositoryRegistry（ORM 工廠註冊點）
 * 3. 註冊所有 Repository 工廠（每個模組一個）
 * 4. 初始化 Gravito PlanetCore 實例
 * 5. 註冊模組服務提供者（框架無關設計）
 * 6. 啟動所有已註冊的提供者
 * 7. 註冊全域路由
 * 8. 註冊全域錯誤處理器
 *
 * @param {number} [port=3000] 預設連接埠
 * @returns {Promise<PlanetCore>} 初始化完成的核心實例
 */

import { PlanetCore, defineConfig } from '@gravito/core'
import { buildConfig } from '../config/index'
import { createGravitoServiceProvider } from './adapters/GravitoServiceProviderAdapter'
import { HealthServiceProvider } from './Modules/Health/Infrastructure/Providers/HealthServiceProvider'
import { UserServiceProvider } from './Modules/User/Infrastructure/Providers/UserServiceProvider'
import { PostServiceProvider } from './Modules/Post/Infrastructure/Providers/PostServiceProvider'
import { registerRoutes } from './routes'
import { initializeRegistry } from './wiring/RepositoryRegistry'
import { registerUserRepositories } from './Modules/User/Infrastructure/Providers/registerUserRepositories'
import { registerPostRepositories } from './Modules/Post/Infrastructure/Providers/registerPostRepositories'
import { getCurrentORM } from './wiring/RepositoryFactory'
import { DatabaseAccessBuilder } from './wiring/DatabaseAccessBuilder'

export async function bootstrap(port = 3000): Promise<PlanetCore> {
	// Step 1: Build application configuration
	const configObj = buildConfig(port)

	// Step 2: Initialize RepositoryRegistry（關鍵步驟：初始化 Repository 註冊點）
	// 所有 Repository 工廠都會註冊到這個全局 Registry
	initializeRegistry()

	// Step 3: Register all Repository factories（通過 DatabaseAccessBuilder 注入 IDatabaseAccess）
	// DatabaseAccessBuilder 是應用的核心決策點：無 DB 時注入 MemoryDatabaseAccess，有 ORM 時注入對應適配器
	//
	// 架構重點：
	// - 只有一個 UserRepository / PostRepository，依賴必填的 IDatabaseAccess
	// - orm=memory 時 db = MemoryDatabaseAccess；orm=drizzle/atlas 時 db = 對應適配器
	// - Repository 底層無 if (db) 分支，完全透過 Port 抽象
	const orm = getCurrentORM()
	const dbBuilder = new DatabaseAccessBuilder(orm)
	const db = dbBuilder.getDatabaseAccess()

	registerUserRepositories(db)
	registerPostRepositories(db)
	// registerOrderRepositories(db)   // 未來：新增 Order 模組時
	// registerProductRepositories(db) // 未來：新增 Product 模組時

	// Step 4: Initialize Gravito core with configuration
	const config = defineConfig({
		config: configObj,
	})

	const core = new PlanetCore(config)

	// Step 5: Register module service providers
	// 注意：順序很重要（依賴關係）
	// - Health 模組：無依賴，最先註冊
	// - User 模組：依賴核心設置
	// - 其他模組：按依賴順序註冊
	// - 這些 ServiceProvider 會從 RepositoryRegistry 取得已註冊的 Repository 工廠

	core.register(createGravitoServiceProvider(new HealthServiceProvider()))
	core.register(createGravitoServiceProvider(new UserServiceProvider()))
	core.register(createGravitoServiceProvider(new PostServiceProvider()))

	// Step 6: Bootstrap all registered providers
	// 執行每個 ServiceProvider 的 boot() 方法
	await core.bootstrap()

	// Step 7: Register global routes
	// 註冊應用所有路由（模組路由 + API 端點）
	await registerRoutes(core)

	// Step 8: Register global error handlers
	// 配置全域例外處理
	core.registerGlobalErrorHandlers()

	return core
}

/**
 * Export bootstrap function as default for direct imports
 * @example
 * import bootstrap from './bootstrap'
 * const core = await bootstrap(3000)
 */
export default bootstrap
