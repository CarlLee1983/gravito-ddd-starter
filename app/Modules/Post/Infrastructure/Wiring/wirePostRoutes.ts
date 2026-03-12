/**
 * @file wirePostRoutes.ts
 * @description Post 模組路由接線（在模組內完成，無需改動 start/wiring）
 *
 * 責任：從容器取得 Application Services → 組裝 Controller → 註冊路由。
 * 僅依賴 Shared 的 IRouteRegistrationContext，不依賴 @gravito/core。
 */

import type { IRouteRegistrationContext } from '@/Shared/Infrastructure/Framework/ModuleDefinition'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { CreatePostService } from '../../Application/Services/CreatePostService'
import { GetPostService } from '../../Application/Services/GetPostService'
import { PostController } from '../../Presentation/Controllers/PostController'
import { registerPostRoutes } from '../../Presentation/Routes/Post.routes'
import { PostRepository } from '../Repositories/PostRepository'
import { UserToPostAdapter } from '../Adapters/UserToPostAdapter'
import { UserRepository } from '@/Modules/User/Infrastructure/Persistence/UserRepository'

/**
 * 註冊 Post 模組路由（供 IModuleDefinition.registerRoutes 使用）
 *
 * @param ctx - 框架無關的註冊用 Context（容器 + 建立路由器）
 */
export function wirePostRoutes(ctx: IRouteRegistrationContext): void {
	const router = ctx.createModuleRouter()

	let createPostService: CreatePostService
	let getPostService: GetPostService

	// 優先從容器中取得服務（若 PostServiceProvider 已註冊）
	try {
		createPostService = ctx.container.make('createPostService') as CreatePostService
		getPostService = ctx.container.make('getPostService') as GetPostService
	} catch (error) {
		// 降級方案：如果容器中沒有服務，直接組裝
		console.warn(
			`⚠️ [Post] Services not found in container, attempting direct instantiation: ${(error as Error).message}`
		)

		try {
			// 從容器中取得資料庫實例
			const db = ctx.container.make('databaseAccess') as IDatabaseAccess

			// 組裝基礎設施層
			const postRepository = new PostRepository(db)
			const userRepository = new UserRepository(db)
			const authorService = new UserToPostAdapter(userRepository)

			// 組裝應用層服務
			createPostService = new CreatePostService(postRepository, authorService)
			getPostService = new GetPostService(postRepository, authorService)
		} catch (fallbackError) {
			console.warn(`⚠️ [Post] Failed to instantiate services, skipping Post routes: ${(fallbackError as Error).message}`)
			return
		}
	}

	const controller = new PostController(createPostService, getPostService)
	registerPostRoutes(router, controller)
}
