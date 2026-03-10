/**
 * GravitoPostAdapter - Post 模組完整適配器
 *
 * 責任：
 * 1. 從 PlanetCore 取得框架服務（Redis/Cache 可能為 undefined）
 * 2. 適配為框架無關的介面
 * 3. 組裝 PostService + PostController
 * 4. 透過 IModuleRouter 註冊路由
 *
 * 這是唯一知道 Gravito 框架細節的地方。
 * 所有業務邏輯層完全無框架耦合。
 */

import type { PlanetCore } from '@gravito/core'


import type { IDatabaseConnectivityCheck } from '@/Shared/Infrastructure/IDatabaseConnectivityCheck'
import { createGravitoModuleRouter } from './GravitoModuleRouter'


import { createGravitoDatabaseConnectivityCheck } from './Atlas'
import { PostRepository } from '@/Modules/Post/Infrastructure/Repositories/PostRepository'
import { PostController } from '@/Modules/Post/Presentation/Controllers/PostController'
import { registerPostRoutes } from '@/Modules/Post/Presentation/Routes/Post.routes'

/**
 * 註冊 Post 模組與 Gravito 框架
 */
export function registerPostWithGravito(core: PlanetCore): void {
	// 從 PlanetCore 容器提取原始服務



	// 適配為框架無關的介面（null 表示未設定）


	const databaseCheck = createGravitoDatabaseConnectivityCheck()

	// 組裝應用層
	const repository = new PostRepository()
	const controller = new PostController(repository)

	// 建立框架無關的路由介面
	const router = createGravitoModuleRouter(core)

	// 透過 IModuleRouter 註冊路由
	registerPostRoutes(router, controller)
}
