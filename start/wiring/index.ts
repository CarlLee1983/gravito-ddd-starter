/**
 * @file index.ts
 * @description 接線層 (Wiring Layer) 統一入口
 *
 * 核心責任：
 * 1. 導出核心裝配組件 (Registry, Factory, Builder)
 * 2. 提供模組路由與控制器裝配的輔助函式
 */

import type { PlanetCore } from '@gravito/core'
import { registerUserRoutes } from '@/Modules/User/Presentation/Routes/api'
import { UserController } from '@/Modules/User/Presentation/Controllers/UserController'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { getCurrentORM } from './RepositoryFactory'

// 核心導出（應用啟動與 Auto-Wiring 使用）
export { DatabaseAccessBuilder, createDatabaseAccess } from './DatabaseAccessBuilder'
export { getCurrentORM, getDatabaseAccess } from './RepositoryFactory'
export { initializeRegistry, getRegistry, resetRegistry } from './RepositoryRegistry'
export { createRepositoryFactory } from './RepositoryFactoryGenerator'
export { ModuleAutoWirer } from './ModuleAutoWirer'

/**
 * 應用啟動時的 ORM 配置摘要
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
 * 註冊 User 模組（供 Auto-Wiring 使用）
 * 這裡展示了如何從容器取出已配置的服務並裝配路由
 *
 * @param core - Gravito 核心實例
 */
export const registerUser = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)

	// 從容器中獲取服務 (已由 UserServiceProvider 註冊)
	let repository: any
	try {
		repository = core.container.make('userRepository')
	} catch {
		// User Repository 未註冊時忽略路由註冊
		console.warn('⚠️ User Repository not found in container, skipping User routes')
		return
	}

	// 實例化控制器並註冊路由
	const controller = new UserController(repository)
	registerUserRoutes(router, controller)
}

/**
 * 註冊其它模組的 Presentation 層...
 * 
 * 註：對於 Health 和 Post 模組，我們使用了整合適配器 (GravitoHealthAdapter)，
 * 它們直接在自己的 index.ts 中被調用。
 */
