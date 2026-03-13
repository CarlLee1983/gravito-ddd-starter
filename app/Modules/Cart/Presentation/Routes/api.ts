/**
 * @file api.ts
 * @description Cart 模組的 HTTP 路由定義
 */

import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import { CartController } from '../Controllers/CartController'

/**
 * 註冊 Cart 模組路由
 *
 * @param router - 模組路由器
 * @param controller - 購物車控制器
 */
export function registerCartRoutes(router: IModuleRouter, controller: CartController): void {
	// 購物車路由
	router.get('/carts/:userId', (ctx) => controller.getCart(ctx))
	router.post('/carts/:userId/items', (ctx) => controller.addItem(ctx))
	router.delete('/carts/:userId/items/:productId', (ctx) =>
		controller.removeItem(ctx)
	)
	router.patch('/carts/:userId/items/:productId', (ctx) =>
		controller.updateItemQuantity(ctx)
	)
	router.delete('/carts/:userId', (ctx) => controller.clearCart(ctx))
	router.post('/carts/:userId/checkout', (ctx) => controller.checkout(ctx))
}
