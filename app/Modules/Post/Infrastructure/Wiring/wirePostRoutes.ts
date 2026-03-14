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

import type { IRouteRegistrationContext } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import type { IPostMessages } from '@/Foundation/Infrastructure/Ports/Messages/IPostMessages'
import { CreatePostService } from '../../Application/Services/CreatePostService'
import { GetPostService } from '../../Application/Services/GetPostService'
import { PostMessageService } from '../Services/PostMessageService'
import { PostController } from '../../Presentation/Controllers/PostController'
import { PostPageController } from '../../Presentation/Controllers/PostPageController'
import { registerPostRoutes } from '../../Presentation/Routes/Post.routes'
import { registerPageRoutes } from '../../Presentation/Routes/pages'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'
import type { IPostQueryService } from '../../Application/Queries/IPostQueryService'

/**
 * 註冊 Post 模組路由（供 IModuleDefinition.registerRoutes 使用）
 *
 * @param ctx - 框架無關的註冊用 Context（容器 + 建立路由器）
 */
export function wirePostRoutes(ctx: IRouteRegistrationContext): void {
	const router = ctx.createModuleRouter()

	// 手動建立訊息服務（不依賴 DI 容器）
	let translator: ITranslator
	try {
		translator = ctx.container.make('translator') as ITranslator
	} catch {
		// 降級：使用假 translator
		translator = {
			trans: (key: string) => key,
			transChoice: (key: string) => key,
			setLocale: () => {},
		} as any
	}
	const postMessages = new PostMessageService(translator)

	// 嘗試從容器取得服務
	let createPostService: CreatePostService
	let getPostService: GetPostService
	try {
		createPostService = ctx.container.make('createPostService') as CreatePostService
		getPostService = ctx.container.make('getPostService') as GetPostService
	} catch (error) {
		console.warn('[wirePostRoutes] Warning: Application services not ready, skipping route registration')
		return
	}

	const controller = new PostController(createPostService, getPostService, postMessages)
	registerPostRoutes(router, controller)

	// 註冊頁面路由
	try {
		const queryService = ctx.container.make('postQueryService') as IPostQueryService
		const pageController = new PostPageController(queryService)
		registerPageRoutes(router, pageController)
	} catch {
		console.warn('[wirePostRoutes] Warning: postQueryService not available for page routes')
	}
}
