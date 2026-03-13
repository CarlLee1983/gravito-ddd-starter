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

	// 直接從容器取得服務（不降級，失敗即報錯）
	const createPostService = ctx.container.make('createPostService') as CreatePostService
	const getPostService = ctx.container.make('getPostService') as GetPostService

	const controller = new PostController(createPostService, getPostService)
	registerPostRoutes(router, controller)
}
