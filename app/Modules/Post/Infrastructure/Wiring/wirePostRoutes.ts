/**
 * @file wirePostRoutes.ts
 * @description Post 模組路由接線（在模組內完成，無需改動 start/wiring）
 *
 * 責任：從容器取得 Application Services → 組裝 Controller → 註冊路由。
 * 僅依賴 Shared 的 IRouteRegistrationContext，不依賴 @gravito/core。
 */

import type { IRouteRegistrationContext } from '@/Shared/Infrastructure/Framework/ModuleDefinition'
import { CreatePostService } from '../../Application/Services/CreatePostService'
import { GetPostService } from '../../Application/Services/GetPostService'
import { PostController } from '../../Presentation/Controllers/PostController'
import { registerPostRoutes } from '../../Presentation/Routes/Post.routes'

/**
 * 註冊 Post 模組路由（供 IModuleDefinition.registerRoutes 使用）
 *
 * @param ctx - 框架無關的註冊用 Context（容器 + 建立路由器）
 */
export function wirePostRoutes(ctx: IRouteRegistrationContext): void {
	const router = ctx.createModuleRouter()

	let createPostService: CreatePostService
	let getPostService: GetPostService
	try {
		createPostService = ctx.container.make('createPostService') as CreatePostService
		getPostService = ctx.container.make('getPostService') as GetPostService
	} catch (error) {
		console.warn(
			`⚠️ [Post] createPostService/getPostService not found in container, skipping Post routes: ${(error as Error).message}`
		)
		return
	}

	const controller = new PostController(createPostService, getPostService)
	registerPostRoutes(router, controller)
}
