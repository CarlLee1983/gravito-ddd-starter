/**
 * @file bootstrap.ts
 * @description DDD 應用啟動流程 (Bootstrap) - 已整合框架模組化與事件系統
 */

import { PlanetCore, defineConfig } from '@gravito/core'
import { OrbitNebula } from '@gravito/nebula'

import { buildConfig } from '../config/app/index'
import { storageConfig, s3RawConfig } from '../config/app/storage'

import { registerRoutes } from 'start/routes'
import { initializeRegistry } from 'start/wiring/RepositoryRegistry'
import { getCurrentORM } from 'start/wiring/RepositoryFactory'
import { DatabaseAccessBuilder } from 'start/wiring/DatabaseAccessBuilder'
import { ModuleAutoWirer } from 'start/wiring/ModuleAutoWirer'

import { S3Store } from '@/Foundation/Infrastructure/Storage/Drivers/S3Store'
import { SharedServiceProvider } from '@/Foundation/Infrastructure/Providers/SharedServiceProvider'
import { InfrastructureServiceProvider } from '@/Foundation/Infrastructure/Providers/InfrastructureServiceProvider'
import { createGravitoServiceProvider } from '@/Foundation/Infrastructure/Adapters/Gravito/GravitoServiceProviderAdapter'

/**
 * 啟動應用程式核心流程
 *
 * @param port - 預設連接埠號碼 (預設為 3000)
 * @returns 回傳初始化完成並準備就緒的 PlanetCore 實例
 */
export async function bootstrap(port = 3000): Promise<PlanetCore> {
	// ─── 配置與倉庫 ─────────────────────────────────────────────────────────
	const appConfig = buildConfig(port)
	initializeRegistry()

	const orm = getCurrentORM()
	const db = new DatabaseAccessBuilder(orm).getDatabaseAccess()

	// ─── 核心與存儲 ─────────────────────────────────────────────────────────
	const core = new PlanetCore(defineConfig({ config: appConfig }))

	// 將 db 註冊到容器中，消除雙軌依賴注入（P0-1 修復）
	core.container.singleton('databaseAccess', () => db)

	// 消除 S3 配置 mutation，使用不可變模式（S2 改進）
	const finalStorageConfig =
		storageConfig.disks?.s3?.driver === 'custom'
			? {
					...storageConfig,
					disks: {
						...storageConfig.disks,
						s3: {
							...storageConfig.disks.s3,
							store: new S3Store(s3RawConfig),
						},
					},
				}
			: storageConfig
	await core.orbit(new OrbitNebula(finalStorageConfig))

	// ─── 基礎設施與模組 ─────────────────────────────────────────────────────
	core.register(createGravitoServiceProvider(new InfrastructureServiceProvider()))
	core.register(createGravitoServiceProvider(new SharedServiceProvider()))

	// ModuleAutoWirer 將從容器解析 eventDispatcher，消除時機窗口問題（P0-2 修復）
	await ModuleAutoWirer.wire(core, db)

	// ─── 路由與收尾 ─────────────────────────────────────────────────────────
	await registerRoutes(core)
	await core.bootstrap()
	core.registerGlobalErrorHandlers()

	return core
}

export default bootstrap
