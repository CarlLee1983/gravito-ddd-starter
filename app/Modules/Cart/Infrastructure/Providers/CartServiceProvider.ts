/**
 * @file CartServiceProvider.ts
 * @description Cart 模組 Service Provider
 */

import { ModuleServiceProvider, type IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import { ProductCatalogAdapter } from '../Adapters/ProductCatalogAdapter'
import { AddItemToCartService } from '../../Application/Services/AddItemToCartService'
import { RemoveItemFromCartService } from '../../Application/Services/RemoveItemFromCartService'
import { CheckoutCartService } from '../../Application/Services/CheckoutCartService'
import type { IProductRepository } from '@/Modules/Product/Domain/Repositories/IProductRepository'
import { getRegistry } from '@wiring/RepositoryRegistry'
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
		container.singleton('cartRepository', () => {
			const registry = getRegistry()
			const orm = getCurrentORM()
			const db = orm !== 'memory' ? getDatabaseAccess() : undefined
			return registry.create('cart', orm, db)
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
	}
}
