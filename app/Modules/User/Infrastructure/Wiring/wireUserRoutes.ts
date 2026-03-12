/**
 * @file wireUserRoutes.ts
 * @description User 模組路由接線（在模組內完成，無需改動 start/wiring）
 *
 * 責任：從容器取得 Application Services → 組裝 Controller → 註冊路由。
 * 僅依賴 Shared 的 IRouteRegistrationContext，不依賴 @gravito/core。
 */

import type { IRouteRegistrationContext } from '@/Shared/Infrastructure/Framework/ModuleDefinition'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { CreateUserService } from '../../Application/Services/CreateUserService'
import { GetUserService } from '../../Application/Services/GetUserService'
import { UserController } from '../../Presentation/Controllers/UserController'
import { registerUserRoutes } from '../../Presentation/Routes/api'
import { UserRepository } from '../Persistence/UserRepository'

/**
 * 註冊 User 模組路由（供 IModuleDefinition.registerRoutes 使用）
 *
 * @param ctx - 框架無關的註冊用 Context（容器 + 建立路由器）
 */
export function wireUserRoutes(ctx: IRouteRegistrationContext): void {
	const router = ctx.createModuleRouter()

	let createUserService: CreateUserService
	let getUserService: GetUserService
	try {
		createUserService = ctx.container.make('createUserService') as CreateUserService
		getUserService = ctx.container.make('getUserService') as GetUserService
	} catch (error) {
		// 降級方案：如果容器中沒有服務，直接組裝
		console.warn(
			`⚠️ [User] Services not found in container, attempting direct instantiation: ${(error as Error).message}`
		)

		try {
			// 從容器中取得資料庫實例
			const db = ctx.container.make('databaseAccess') as IDatabaseAccess

			// 組裝 Repository 和 Services
			const userRepository = new UserRepository(db)
			createUserService = new CreateUserService(userRepository)
			getUserService = new GetUserService(userRepository)
		} catch (fallbackError) {
			console.warn(`⚠️ [User] Failed to instantiate services, skipping User routes: ${(fallbackError as Error).message}`)
			return
		}
	}

	const controller = new UserController(createUserService, getUserService)
	registerUserRoutes(router, controller)
}
