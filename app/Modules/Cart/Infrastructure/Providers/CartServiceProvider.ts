/**
 * @file CartServiceProvider.ts
 * @description Cart 模組 Service Provider
 *
 * 負責：
 * 1. 在 DI 容器中註冊所有應用層服務
 * 2. 配置防腐層適配器
 * 3. 設置服務之間的依賴關係
 */

import type { Container } from '@gravito/core'
import { ProductCatalogAdapter } from '../Adapters/ProductCatalogAdapter'
import { AddItemToCartService } from '../../Application/Services/AddItemToCartService'
import { RemoveItemFromCartService } from '../../Application/Services/RemoveItemFromCartService'
import { CheckoutCartService } from '../../Application/Services/CheckoutCartService'
import type { IProductRepository } from '@/Modules/Product/Domain/Repositories/IProductRepository'

/**
 * Cart 模組 Service Provider
 */
export class CartServiceProvider {
	/**
	 * 在容器中註冊 Cart 模組的所有服務
	 *
	 * @param container - DI 容器
	 */
	register(container: Container): void {
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

	/**
	 * 啟動 Cart 模組時的初始化邏輯
	 * （若需要）
	 */
	boot(): void {
		// 暫無初始化邏輯
	}
}
