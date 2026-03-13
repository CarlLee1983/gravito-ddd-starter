/**
 * @file wirePostRoutes.ts
 * @description Post 模組路由接線（在模組內完成，無需改動 start/wiring）
 *
 * 責任：從容器取得 Application Services → 組裝 Controller → 註冊路由。
 * 僅依賴 Shared 的 IRouteRegistrationContext，不依賴 @gravito/core。
 *
 * 架構規則：
 * - 避免直接 import 其他模組的具體實現（UserRepository）
 * - 改為透過 RepositoryResolver 或容器取得，保持介面層級依賴
 * - 降級方案也應遵守模組邊界
 */

import type { IRouteRegistrationContext } from '@/Shared/Infrastructure/Framework/ModuleDefinition'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { resolveRepository } from '@wiring/RepositoryResolver'
import { CreatePostService } from '../../Application/Services/CreatePostService'
import { GetPostService } from '../../Application/Services/GetPostService'
import { PostController } from '../../Presentation/Controllers/PostController'
import { registerPostRoutes } from '../../Presentation/Routes/Post.routes'
import { PostRepository } from '../Repositories/PostRepository'
import { UserToPostAdapter } from '../Adapters/UserToPostAdapter'
import type { IUserRepository } from '@/Modules/User/Domain/Repositories/IUserRepository'

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
		// 重要：即使在降級方案中，也應遵守模組邊界 - 透過 RepositoryResolver 取得 User Repository
		console.warn(
			`⚠️ [Post] Services not found in container, attempting direct instantiation: ${(error as Error).message}`
		)

		try {
			// 從容器中取得資料庫實例
			const db = ctx.container.make('databaseAccess') as IDatabaseAccess

			// 嘗試從容器中取得 eventDispatcher
			let eventDispatcher: any = undefined
			try {
				eventDispatcher = ctx.container.make('eventDispatcher')
			} catch {
				// eventDispatcher 尚未註冊，忽略
			}

			// === 重要：透過 RepositoryResolver 取得 User Repository（保持模組邊界）===
			// 而非直接 import 和實例化 UserRepository 具體實現
			const userRepository = resolveRepository('user') as IUserRepository
			const authorService = new UserToPostAdapter(userRepository)

			// 組裝 Post Repository 實例
			const postRepository = new PostRepository(db, eventDispatcher)

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
