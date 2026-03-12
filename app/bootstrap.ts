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
import { SharedServiceProvider } from 'providers/SharedServiceProvider'
import { InfrastructureServiceProvider } from 'providers/InfrastructureServiceProvider'
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

	// Step 5: 安裝 Nebula 存儲軌道 (Orbit)
	// 注入自定義 S3 驅動
	if (storageConfig.disks?.s3?.driver === 'custom') {
		storageConfig.disks.s3.store = new S3Store(s3RawConfig)
	}
	const nebula = new OrbitNebula(storageConfig)
	core.addOrbit(nebula)

	// Step 6: 在容器中註冊資料庫實例（供模組使用）
	core.container.singleton('databaseAccess', () => db)

	// Step 6: 註冊基礎設施適配器 (由 Gravito 框架模組驅動)
	core.register(createGravitoServiceProvider(new InfrastructureServiceProvider()))

	// Step 7: 註冊基礎設施共享服務 (如 EventDispatcher)
	// 透過 PlanetCore 的容器系統註冊 Provider
	core.register(createGravitoServiceProvider(new SharedServiceProvider()))

	// Step 7.5: 確保關鍵服務（如 EventDispatcher）在自動佈線前已實例化
	console.log('🔧 [Bootstrap] Step 7.5: 確保 eventDispatcher 已就緒...')
	let eventDispatcher: any = undefined
	try {
		// 這裡透過容器 make 來觸發實例化，模組裝配 (Step 8) 需要它來處理領域事件
		eventDispatcher = core.container.make('eventDispatcher')
		console.log('✅ [Bootstrap] eventDispatcher 已初始化:', eventDispatcher?.constructor.name)
	} catch (error) {
		console.warn('⚠️ [Bootstrap] eventDispatcher 初始化警告 (可能尚未註冊):', error instanceof Error ? error.message : error)
	}

	// Step 8: ✨ 自動掃描並裝配所有模組 (Auto-Wiring)
	await ModuleAutoWirer.wire(core, db, eventDispatcher)

	// Step 9: 執行 ServiceProvider 的 boot() 初始化
	await core.bootstrap()

	// Step 10: 註冊全域路由
	await registerRoutes(core)

	// Step 11: 註冊全域錯誤處理器
	core.registerGlobalErrorHandlers()

	return core
}

export default bootstrap
