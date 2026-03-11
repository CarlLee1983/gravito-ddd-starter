/**
 * @file GravitoPostAdapter.ts
 * @description Post 模組完整框架適配器
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：負責將 Post 模組掛載到具體的 Web 框架。
 * - 職責：作為 Post 模組與 Gravito 框架的唯一接觸點，處理依賴組裝、ACL 配置與路由註冊。
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
 * 註冊 Post 模組與 Gravito 框架的整合
 *
 * 採用 DDD + ACL (Anti-Corruption Layer) 實踐：
 * 1. 為 Post 建立專用的 Repository。
 * 2. 為 User 建立專用的 Repository（供 ACL 轉接使用）。
 * 3. 透過 UserToPostAdapter 實作 IAuthorService Port，隔離不同領域。
 * 4. 注入 Controller，確保應用層與表現層解耦。
 *
 * @param core - Gravito 核心實例
 */
export function registerPostWithGravito(core: PlanetCore): void {
	// 建立資料庫訪問實例（目前固定使用 Atlas adapter，未來可根據配置動態決定）
	const db = createAtlasDatabaseAccess()

	// 組裝基礎設施層：各模組專屬 Repository
	const postRepository = new PostRepository(db)
	const userRepository = new UserRepository(db)

	// 組裝 ACL 層：將 User 領域適配為 Post 領域所需的作者服務（實作 IAuthorService Port）
	const authorService = new UserToPostAdapter(userRepository)

	// 組裝表現層：Controller（依賴 Repository 與作者服務 Port）
	const controller = new PostController(postRepository, authorService)

	// 建立框架無關的路由介面
	const router = createGravitoModuleRouter(core)

	// 透過統一的模組路由介面註冊所有端點
	registerPostRoutes(router, controller)
}
