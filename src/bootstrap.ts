/**
 * DDD 應用啟動流程 (Bootstrap)
 *
 * 責任：
 * 1. 載入並建立配置 (buildConfig)
 * 2. 初始化 Gravito PlanetCore 實例
 * 3. 註冊模組服務提供者（框架無關設計）
 * 4. 啟動所有已註冊的提供者
 * 5. 註冊全域路由
 * 6. 註冊全域錯誤處理器
 *
 * @param {number} [port=3000] 預設連接埠
 * @returns {Promise<PlanetCore>} 初始化完成的核心實例
 */

import { PlanetCore, defineConfig } from '@gravito/core'
import { buildConfig } from '../config/index'
import { createGravitoServiceProvider } from './adapters/GravitoServiceProviderAdapter'
import { HealthServiceProvider } from './Modules/Health/Infrastructure/Providers/HealthServiceProvider'
import { UserServiceProvider } from './Modules/User/Infrastructure/Providers/UserServiceProvider'
import { registerRoutes } from './routes'

export async function bootstrap(port = 3000): Promise<PlanetCore> {
	// Step 1: Build application configuration
	const configObj = buildConfig(port)

	// Step 2: Initialize Gravito core with configuration
	const config = defineConfig({
		config: configObj,
	})

	const core = new PlanetCore(config)

	// Step 3: Register module service providers
	// 注意：順序很重要（依賴關係）
	// - Health 模組：無依賴，最先註冊
	// - User 模組：依賴核心設置
	// - 其他模組：按依賴順序註冊

	core.register(createGravitoServiceProvider(new HealthServiceProvider()))
	core.register(createGravitoServiceProvider(new UserServiceProvider()))

	// Step 4: Bootstrap all registered providers
	// 執行每個 ServiceProvider 的 boot() 方法
	await core.bootstrap()

	// Step 5: Register global routes
	// 註冊應用所有路由（模組路由 + API 端點）
	await registerRoutes(core)

	// Step 6: Register global error handlers
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
