/**
 * @file api.ts
 * @description Cart 模組的 HTTP 路由定義
 */

import type { Router } from 'express'
import { CartController } from '../Controllers/CartController'
import type { Container } from '@gravito/core'

/**
 * 註冊 Cart 模組路由
 *
 * @param router - Express 路由器
 * @param container - DI 容器
 */
export function registerCartRoutes(router: Router, container: Container): void {
	const addItemService = container.make('addItemToCartService')
	const removeItemService = container.make('removeItemFromCartService')
	const checkoutService = container.make('checkoutCartService')
	const cartRepository = container.make('cartRepository')

	const controller = new CartController(
		addItemService,
		removeItemService,
		checkoutService,
		cartRepository
	)

	// 購物車路由
	router.get('/carts/:userId', (req, res) => controller.getCart(req, res))
	router.post('/carts/:userId/items', (req, res) => controller.addItem(req, res))
	router.delete('/carts/:userId/items/:productId', (req, res) =>
		controller.removeItem(req, res)
	)
	router.patch('/carts/:userId/items/:productId', (req, res) =>
		controller.updateItemQuantity(req, res)
	)
	router.delete('/carts/:userId', (req, res) => controller.clearCart(req, res))
	router.post('/carts/:userId/checkout', (req, res) => controller.checkout(req, res))
}
