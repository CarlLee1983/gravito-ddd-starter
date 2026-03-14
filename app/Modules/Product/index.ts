/**
 * @file index.ts
 * @description Product 模組公開 API 導出與裝配定義
 */

import type { IModuleDefinition } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import { ProductServiceProvider } from './Infrastructure/Providers/ProductServiceProvider'
import { registerProductRepositories } from './Infrastructure/Providers/registerProductRepositories'
import { wireProductRoutes } from './Infrastructure/Wiring/wireProductRoutes'

// Domain - Aggregates
export { Product } from './Domain/Aggregates/Product'

// Domain - ValueObjects
export { ProductId } from './Domain/ValueObjects/ProductId'
export { ProductName } from './Domain/ValueObjects/ProductName'
export { Price, Currency } from './Domain/ValueObjects/Price'
export { SKU } from './Domain/ValueObjects/SKU'
export { StockQuantity } from './Domain/ValueObjects/StockQuantity'

// Domain - Events
export { ProductCreated } from './Domain/Events/ProductCreated'
export { ProductPriceChanged } from './Domain/Events/ProductPriceChanged'
export { StockAdjusted } from './Domain/Events/StockAdjusted'

// Domain - Repositories
export type { IProductRepository } from './Domain/Repositories/IProductRepository'

// Application - Services
export { CreateProductService } from './Application/Services/CreateProductService'
export { GetProductService } from './Application/Services/GetProductService'

// Application - DTOs
export type { ProductResponseDTO } from './Application/DTOs/ProductResponseDTO'

// Application - ReadModels (CQRS)
export type { ProductReadModel } from './Application/ReadModels/ProductReadModel'

// Application - Queries (CQRS)
export type { IProductQueryService } from './Application/Queries/IProductQueryService'

// Infrastructure
export { ProductRepository } from './Infrastructure/Persistence/ProductRepository'
export { ProductServiceProvider } from './Infrastructure/Providers/ProductServiceProvider'

// Presentation
export { ProductController } from './Presentation/Controllers/ProductController'

/**
 * 裝配器專用的模組定義物件
 * 使模組可被自動掃描裝配 (Auto-Wiring)
 */
export const ProductModule: IModuleDefinition = {
  name: 'Product',
  provider: ProductServiceProvider,
  registerRepositories: registerProductRepositories,
  registerRoutes: wireProductRoutes
}
