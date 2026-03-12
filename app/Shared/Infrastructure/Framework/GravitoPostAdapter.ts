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

import type { IRouteRegistrationContext } from './ModuleDefinition'
import { PostController } from '@/Modules/Post/Presentation/Controllers/PostController'
import { registerPostRoutes } from '@/Modules/Post/Presentation/Routes/Post.routes'
import { CreatePostService } from '@/Modules/Post/Application/Services/CreatePostService'
import { GetPostService } from '@/Modules/Post/Application/Services/GetPostService'

/**
 * 註冊 Post 模組與 Gravito 框架的整合
 *
 * 採用 DDD + ACL (Anti-Corruption Layer) 實踐：
 * 1. 為 Post 建立專用的 Repository。
 * 2. 為 User 建立專用的 Repository（供 ACL 轉接使用）。
 * 3. 透過 UserToPostAdapter 實作 IAuthorService Port，隔離不同領域。
 * 4. 注入 Controller，確保應用層與表現層解耦。
 *
 * @param ctx - 框架無關的註冊用 Context（容器 + 建立路由器）
 */
export function registerPostWithGravito(ctx: IRouteRegistrationContext): void {
	const router = ctx.createModuleRouter()

	let createPostService: CreatePostService
	let getPostService: GetPostService

	// 優先從容器中取得應用層服務（由 PostServiceProvider 註冊）
	try {
		createPostService = ctx.container.make('createPostService') as CreatePostService
		getPostService = ctx.container.make('getPostService') as GetPostService
	} catch (error) {
		console.warn(`⚠️ [Post] Services not found in container, skipping Post routes: ${(error as Error).message}`)
		return
	}

	// 組裝表現層：Controller（依賴應用層服務）
	const controller = new PostController(createPostService, getPostService)

	// 透過統一的模組路由介面註冊所有端點
	registerPostRoutes(router, controller)
}
