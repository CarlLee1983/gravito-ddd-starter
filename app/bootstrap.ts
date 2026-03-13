/**
 * @file bootstrap.ts
 * @description DDD 應用啟動流程 (Bootstrap) - 已整合框架模組化與事件系統
 */

import { PlanetCore, defineConfig } from '@gravito/core'
import { OrbitNebula } from '@gravito/nebula'
import { buildConfig } from '../config/app/index'
import { storageConfig, s3RawConfig } from '../config/app/storage'
import { S3Store } from '@/Shared/Infrastructure/Storage/Drivers/S3Store'
import { registerRoutes } from 'start/routes'
import { initializeRegistry } from 'start/wiring/RepositoryRegistry'
import { getCurrentORM } from 'start/wiring/RepositoryFactory'
import { DatabaseAccessBuilder } from 'start/wiring/DatabaseAccessBuilder'
import { ModuleAutoWirer } from 'start/wiring/ModuleAutoWirer'
import { SharedServiceProvider } from '@providers/SharedServiceProvider'
import { InfrastructureServiceProvider } from '@providers/InfrastructureServiceProvider'
import { createGravitoServiceProvider } from '@/Shared/Infrastructure/Adapters/Gravito/GravitoServiceProviderAdapter'

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

	// Step 5: 安裝 Nebula 存儲軌道 (Orbit)
	if (storageConfig.disks?.s3?.driver === 'custom') {
		;(storageConfig.disks.s3 as { store?: unknown }).store = new S3Store(s3RawConfig)
	}
	const nebula = new OrbitNebula(storageConfig)
	await core.orbit(nebula)

	// Step 6: 註冊基礎設施適配器
	core.register(createGravitoServiceProvider(new InfrastructureServiceProvider()))
	core.register(createGravitoServiceProvider(new SharedServiceProvider()))

	// Step 7: 確保關鍵服務（如 EventDispatcher）在自動佈線前已實例化
	let eventDispatcher: any = undefined
	try {
		eventDispatcher = core.container.make('eventDispatcher')
	} catch (error) {
		// Ignore
	}

	// Step 8: ✨ 自動掃描並裝配所有模組 (Auto-Wiring)
	await ModuleAutoWirer.wire(core, db, eventDispatcher)

	// Step 9: 註冊全域路由
	await registerRoutes(core)

	// Step 10: 執行 ServiceProvider 的 boot() 初始化
	await core.bootstrap()

	// Step 11: 註冊全域錯誤處理器
	core.registerGlobalErrorHandlers()

	return core
}

export default bootstrap
