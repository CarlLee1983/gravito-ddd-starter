/**
 * @file wireUserRoutes.ts
 * @description User 模組路由接線（在模組內完成，無需改動 start/wiring）
 *
 * 責任：從容器取得 Application Services → 組裝 Controller → 註冊路由。
 * 僅依賴 Shared 的 IRouteRegistrationContext，不依賴 @gravito/core。
 */

import type { IRouteRegistrationContext } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import type { IUserMessages } from '@/Foundation/Infrastructure/Ports/Messages/IUserMessages'
import { CreateUserService } from '../../Application/Services/CreateUserService'
import { GetUserService } from '../../Application/Services/GetUserService'
import { UserMessageService } from '../Services/UserMessageService'
import { UserController } from '../../Presentation/Controllers/UserController'
import { UserPageController } from '../../Presentation/Controllers/UserPageController'
import { registerUserRoutes } from '../../Presentation/Routes/api'
import { registerPageRoutes } from '../../Presentation/Routes/pages'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'
import type { IUserQueryService } from '../../Application/Queries/IUserQueryService'

/**
 * 註冊 User 模組路由（供 IModuleDefinition.registerRoutes 使用）
 *
 * @param ctx - 框架無關的註冊用 Context（容器 + 建立路由器）
 */
export function wireUserRoutes(ctx: IRouteRegistrationContext): void {
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

	// 嘗試從容器取得服務
	let createUserService: CreateUserService
	let getUserService: GetUserService
	let userMessages: IUserMessages
	try {
		createUserService = ctx.container.make('createUserService') as CreateUserService
		getUserService = ctx.container.make('getUserService') as GetUserService
		userMessages = ctx.container.make('userMessages') as IUserMessages
	} catch (error) {
		console.warn('[wireUserRoutes] Warning: Application services not ready, skipping route registration')
		return
	}

	const controller = new UserController(createUserService, getUserService, userMessages)
	registerUserRoutes(router, controller)

	// 註冊頁面路由
	try {
		const queryService = ctx.container.make('userQueryService') as IUserQueryService
		const pageController = new UserPageController(queryService)
		registerPageRoutes(router, pageController)
	} catch {
		console.warn('[wireUserRoutes] Warning: userQueryService not available for page routes')
	}
}
