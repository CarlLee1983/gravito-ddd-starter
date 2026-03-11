/**
 * @file bootstrap.ts
 * @description DDD 應用啟動流程 (Bootstrap) - 已整合框架模組化與事件系統
 */

import { PlanetCore, defineConfig } from '@gravito/core'
import { buildConfig } from '../config/app/index'
import { registerRoutes } from './routes'
import { initializeRegistry } from './wiring/RepositoryRegistry'
import { getCurrentORM } from './wiring/RepositoryFactory'
import { DatabaseAccessBuilder } from './wiring/DatabaseAccessBuilder'
import { ModuleAutoWirer } from './wiring/ModuleAutoWirer'
import { SharedServiceProvider } from '@/Shared/Infrastructure/Providers/SharedServiceProvider'
import { InfrastructureServiceProvider } from '@/Shared/Infrastructure/Providers/InfrastructureServiceProvider'
import { createGravitoServiceProvider } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'

/**
 * 啟動應用程式核心流程
 *
 * @param port - 預設連接埠號碼 (預設為 3000)
 * @returns 回傳初始化完成並準備就緒的 PlanetCore 實例
 */
export async function bootstrap(port = 3000): Promise<PlanetCore> {
	// Step 1: 建立應用程式配置
	const configObj = buildConfig(port)

	// Step 2: 初始化 RepositoryRegistry (倉庫工廠註冊點)
	initializeRegistry()

	// Step 3: 初始化資料庫訪問與適配器
	const orm = getCurrentORM()
	const dbBuilder = new DatabaseAccessBuilder(orm)
	const db = dbBuilder.getDatabaseAccess()

	// Step 4: 以配置初始化 Gravito 核心實例
	const config = defineConfig({
		config: configObj,
	})
	const core = new PlanetCore(config)

	// Step 5: 註冊基礎設施適配器 (由 Gravito 框架模組驅動)
	core.register(createGravitoServiceProvider(new InfrastructureServiceProvider()))

	// Step 6: 註冊基礎設施共享服務 (如 EventDispatcher)
	core.register(createGravitoServiceProvider(new SharedServiceProvider()))

	// Step 7 & 8: ✨ 自動掃描並裝配所有模組 (Auto-Wiring)
	await ModuleAutoWirer.wire(core, db)

	// Step 9: 執行 ServiceProvider 的 boot() 初始化
	await core.bootstrap()

	// Step 10: 註冊全域路由
	await registerRoutes(core)

	// Step 11: 註冊全域錯誤處理器
	core.registerGlobalErrorHandlers()

	return core
}

export default bootstrap
