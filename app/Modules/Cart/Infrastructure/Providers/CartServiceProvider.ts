/**
 * @file CartServiceProvider.ts
 * @description Cart 模組 Service Provider
 */

import { ModuleServiceProvider, type IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import type { IEventDispatcher } from '@/Foundation/Infrastructure/Ports/Messaging/IEventDispatcher'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'
import { ProductCatalogAdapter } from '../Adapters/ProductCatalogAdapter'
import { AddItemToCartService } from '../../Application/Services/AddItemToCartService'
import { RemoveItemFromCartService } from '../../Application/Services/RemoveItemFromCartService'
import { CheckoutCartService } from '../../Application/Services/CheckoutCartService'
import { ClearCartOnOrderCreatedHandler } from '../../Application/Handlers/ClearCartOnOrderCreatedHandler'
import { CartMessageService } from '../Services/CartMessageService'
import type { IProductRepository } from '@/Modules/Product/Domain/Repositories/IProductRepository'
import type { RepositoryRegistry } from '@wiring/RepositoryRegistry'
import { getCurrentORM, getDatabaseAccess } from '@wiring/RepositoryFactory'

/**
 * Cart 模組 Service Provider
 */
export class CartServiceProvider extends ModuleServiceProvider {
	/**
	 * 在容器中註冊 Cart 模組的所有服務
	 *
	 * @param container - DI 容器
	 */
	override register(container: IContainer): void {
		// 註冊 Repository
		container.singleton('cartRepository', (c: IContainer) => {
			const registry = c.make('repositoryRegistry') as RepositoryRegistry
			const orm = getCurrentORM()
			const db = orm !== 'memory' ? getDatabaseAccess() : undefined
			return registry.create('cart', orm, db)
		})

		// 0. 註冊訊息服務（使用工廠方法延遲解析 translator）
		container.singleton('cartMessages', (c) => {
			try {
				const translator = c.make('translator') as ITranslator
				return new CartMessageService(translator)
			} catch {
				// 如果 translator 還未註冊（啟動期間），使用虛擬實現
				const fallback: any = {
					trans: (key: string) => key,
					choice: (key: string) => key,
					setLocale: () => {},
					getLocale: () => 'en',
				}
				return new CartMessageService(fallback)
			}
		})

		// 1. 註冊防腐層適配器
		container.singleton('productCatalogAdapter', (c) => {
			const productRepository = c.make('productRepository') as IProductRepository
			return new ProductCatalogAdapter(productRepository)
		})

		// 2. 註冊應用層服務
		container.singleton('addItemToCartService', (c) => {
			const cartRepository = c.make('cartRepository')
			const productQuery = c.make('productCatalogAdapter')

			return new AddItemToCartService(cartRepository, productQuery)
		})

		container.singleton('removeItemFromCartService', (c) => {
			const cartRepository = c.make('cartRepository')

			return new RemoveItemFromCartService(cartRepository)
		})

		container.singleton('checkoutCartService', (c) => {
			const cartRepository = c.make('cartRepository')

			return new CheckoutCartService(cartRepository)
		})

		// 3. 註冊事件處理器
		container.singleton('clearCartOnOrderCreatedHandler', (c) => {
			const cartRepository = c.make('cartRepository')
			const logger = c.make('logger')
			return new ClearCartOnOrderCreatedHandler(cartRepository, logger)
		})
	}

	/**
	 * 啟動與綁定事件
	 *
	 * @param container - DI 容器
	 */
	override boot(container: IContainer): void {
		try {
			const dispatcher = container.make('eventDispatcher') as IEventDispatcher
			const handler = container.make('clearCartOnOrderCreatedHandler') as ClearCartOnOrderCreatedHandler
			
			// 訂閱跨模組整合事件
			dispatcher.subscribe(handler.eventName, (event) => handler.handle(event))
		} catch (error) {
			console.warn('[CartServiceProvider] Warning: Event dispatcher or handler not ready, skipping event subscription')
		}
	}
}
