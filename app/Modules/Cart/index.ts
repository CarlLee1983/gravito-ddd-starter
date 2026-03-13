/**
 * @file index.ts
 * @description Cart 模組公開 API 導出與裝配定義
 */

import type { IModuleDefinition } from '@/Shared/Infrastructure/Wiring/ModuleDefinition'
import { CartServiceProvider } from './Infrastructure/Providers/CartServiceProvider'
import { registerCartRepositories } from './Infrastructure/Providers/registerCartRepositories'
import { wireCartRoutes } from './Infrastructure/Wiring/wireCartRoutes'

// Domain - Aggregates
export { Cart } from './Domain/Aggregates/Cart'
export { CartItem } from './Domain/Aggregates/CartItem'

// Domain - ValueObjects
export { CartId } from './Domain/ValueObjects/CartId'
export { CartItemId } from './Domain/ValueObjects/CartItemId'
export { Quantity } from './Domain/ValueObjects/Quantity'

// Domain - Events
export { CartCreated } from './Domain/Events/CartCreated'
export { ItemAdded } from './Domain/Events/ItemAdded'
export { ItemRemoved } from './Domain/Events/ItemRemoved'
export { ItemQuantityChanged } from './Domain/Events/ItemQuantityChanged'
export { CartCleared } from './Domain/Events/CartCleared'
export { CartCheckoutRequested } from './Domain/Events/CartCheckoutRequested'

// Domain - Repositories
export type { ICartRepository } from './Domain/Repositories/ICartRepository'

// Domain - Services/Ports
export type { IProductQueryPort } from './Domain/Services/IProductQueryPort'

// Application - Services
export { AddItemToCartService } from './Application/Services/AddItemToCartService'
export { RemoveItemFromCartService } from './Application/Services/RemoveItemFromCartService'
export { CheckoutCartService } from './Application/Services/CheckoutCartService'

// Application - DTOs
export type { AddItemDTO } from './Application/DTOs/AddItemDTO'
export type { CartResponseDTO } from './Application/DTOs/CartResponseDTO'
export { toCartResponseDTO } from './Application/DTOs/CartResponseDTO'

// Infrastructure
export { CartRepository } from './Infrastructure/Persistence/CartRepository'
export { CartServiceProvider } from './Infrastructure/Providers/CartServiceProvider'
export { ProductCatalogAdapter } from './Infrastructure/Adapters/ProductCatalogAdapter'

// Presentation
export { CartController } from './Presentation/Controllers/CartController'
export { registerCartRoutes } from './Presentation/Routes/api'

/**
 * 裝配器專用的模組定義物件
 * 使模組可被自動掃描裝配 (Auto-Wiring)
 */
export const CartModule: IModuleDefinition = {
	name: 'Cart',
	provider: CartServiceProvider,
	registerRepositories: registerCartRepositories,
	registerRoutes: wireCartRoutes,
}
