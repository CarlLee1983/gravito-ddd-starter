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

import { createGravitoModuleRouter } from './GravitoModuleRouter'
import { createAtlasDatabaseAccess } from '../Database/Adapters/Atlas'
import { PostRepository } from '@/Modules/Post/Infrastructure/Repositories/PostRepository'
import { PostController } from '@/Modules/Post/Presentation/Controllers/PostController'
import { registerPostRoutes } from '@/Modules/Post/Presentation/Routes/Post.routes'
import { UserToPostAdapter } from '@/Modules/Post/Infrastructure/Adapters/UserToPostAdapter'
import { UserRepository } from '@/Modules/User/Infrastructure/Persistence/UserRepository'

/**
 * 註冊 Post 模組與 Gravito 框架
 *
 * DDD + ACL 實踐：
 * 1. 為 Post 創建 Repository（存取 Post 資料）
 * 2. 為 User 創建 Repository（供 ACL 使用）
 * 3. 通過 UserToPostAdapter 實現 IAuthorService Port
 * 4. 注入 Controller，讓 Application 層只依賴 Port
 */
export function registerPostWithGravito(core: PlanetCore): void {
	// 建立資料庫訪問實例（使用 Atlas adapter）
	const db = createAtlasDatabaseAccess()

	// 組裝應用層：Repository
	const postRepository = new PostRepository(db)
	const userRepository = new UserRepository(db)

	// 組裝 ACL：User → Post 適配器（實現 IAuthorService Port）
	const authorService = new UserToPostAdapter(userRepository)

	// 組裝 Controller（依賴 Repository + AuthorService Port）
	const controller = new PostController(postRepository, authorService)

	// 建立框架無關的路由介面
	const router = createGravitoModuleRouter(core)

	// 透過 IModuleRouter 註冊路由
	registerPostRoutes(router, controller)
}
