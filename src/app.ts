/**
 * Application Bootstrap
 *
 * 在此處完成框架耦合：
 * - 導入框架無關的 ModuleServiceProvider
 * - 使用 Gravito 適配器將其適配為框架特定的實現
 * - 其他所有層都保持框架無關
 */

import { PlanetCore, defineConfig } from '@gravito/core'
import { buildConfig } from '../config/index'
import { registerRoutes } from './routes'
import { createGravitoServiceProvider } from './adapters/GravitoServiceProviderAdapter'
import { HealthServiceProvider } from './Modules/Health/Infrastructure/Providers/HealthServiceProvider'
import { UserServiceProvider } from './Modules/User/Infrastructure/Providers/UserServiceProvider'

export async function createApp() {
	// Build configuration
	const configObj = buildConfig()

	// Initialize Gravito core
	const config = defineConfig({
		config: configObj,
	})

	// Create core instance
	const core = new PlanetCore(config)

	// 註冊所有模組服務提供者（順序取決於依賴）
	// 使用適配器將框架無關的 ModuleServiceProvider 適配為 Gravito 的 ServiceProvider

	// Health 模組：沒有依賴，優先註冊
	core.register(createGravitoServiceProvider(new HealthServiceProvider()))

	// User 模組：依賴核心設置
	core.register(createGravitoServiceProvider(new UserServiceProvider()))

	// 啟動所有已註冊的提供者
	await core.bootstrap()

	// 註冊所有路由
	await registerRoutes(core)

	return core
}
