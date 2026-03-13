/**
 * @file wireCartRoutes.ts
 * @description Cart 模組路由裝配
 *
 * 責任：從容器取得 Application Services → 組裝 Controller → 註冊路由。
 * 僅依賴 Shared 的 IRouteRegistrationContext，不依賴特定框架。
 */

import type { IRouteRegistrationContext } from '@/Shared/Infrastructure/Wiring/ModuleDefinition'
import type { AddItemToCartService } from '../../Application/Services/AddItemToCartService'
import type { RemoveItemFromCartService } from '../../Application/Services/RemoveItemFromCartService'
import type { CheckoutCartService } from '../../Application/Services/CheckoutCartService'
import type { ICartRepository } from '../../Domain/Repositories/ICartRepository'
import { CartController } from '../../Presentation/Controllers/CartController'
import { registerCartRoutes } from '../../Presentation/Routes/api'
import { registerPageRoutes } from '../../Presentation/Routes/pages'

/**
 * 註冊 Cart 模組路由（供 IModuleDefinition.registerRoutes 使用）
 *
 * @param ctx - 框架無關的註冊用 Context（容器 + 建立路由器）
 */
export function wireCartRoutes(ctx: IRouteRegistrationContext): void {
	const router = ctx.createModuleRouter()

	// 嘗試從容器取得服務
	let addItemService: AddItemToCartService
	let removeItemService: RemoveItemFromCartService
	let checkoutService: CheckoutCartService
	let cartRepository: ICartRepository

	try {
		addItemService = ctx.container.make('addItemToCartService') as AddItemToCartService
		removeItemService = ctx.container.make('removeItemFromCartService') as RemoveItemFromCartService
		checkoutService = ctx.container.make('checkoutCartService') as CheckoutCartService
		cartRepository = ctx.container.make('cartRepository') as ICartRepository
	} catch (error) {
		console.warn('[wireCartRoutes] Warning: Application services not ready, skipping route registration')
		return
	}

	const controller = new CartController(
		addItemService,
		removeItemService,
		checkoutService,
		cartRepository
	)

	registerCartRoutes(router, controller)

	// 註冊頁面路由
	registerPageRoutes(router, cartRepository)
}
