/**
 * @file wireUserRoutes.ts
 * @description User 模組路由接線（在模組內完成，無需改動 start/wiring）
 *
 * 責任：從容器取得 Application Services → 組裝 Controller → 註冊路由。
 * 僅依賴 Shared 的 IRouteRegistrationContext，不依賴 @gravito/core。
 */

import type { IRouteRegistrationContext } from '@/Shared/Infrastructure/Framework/ModuleDefinition'
import { CreateUserService } from '../../Application/Services/CreateUserService'
import { GetUserService } from '../../Application/Services/GetUserService'
import { UserController } from '../../Presentation/Controllers/UserController'
import { registerUserRoutes } from '../../Presentation/Routes/api'

/**
 * 註冊 User 模組路由（供 IModuleDefinition.registerRoutes 使用）
 *
 * @param ctx - 框架無關的註冊用 Context（容器 + 建立路由器）
 */
export function wireUserRoutes(ctx: IRouteRegistrationContext): void {
	const router = ctx.createModuleRouter()

	// 直接從容器取得服務（不降級，失敗即報錯）
	const createUserService = ctx.container.make('createUserService') as CreateUserService
	const getUserService = ctx.container.make('getUserService') as GetUserService

	const controller = new UserController(createUserService, getUserService)
	registerUserRoutes(router, controller)
}
