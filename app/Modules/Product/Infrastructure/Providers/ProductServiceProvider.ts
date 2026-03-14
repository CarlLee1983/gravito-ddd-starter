/**
 * @file ProductServiceProvider.ts
 * @description 產品 Service Provider (DI 容器配置)
 */

import { ModuleServiceProvider, type IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import { CreateProductService } from '../../Application/Services/CreateProductService'
import { GetProductService } from '../../Application/Services/GetProductService'

import { ProductQueryService } from '../Persistence/ProductQueryService'
import { getRegistry } from '@wiring/RepositoryRegistry'
import { getCurrentORM, getDatabaseAccess } from '@wiring/RepositoryFactory'

export class ProductServiceProvider extends ModuleServiceProvider {
  /**
   * 註冊服務到容器
   *
   * @param container - DI 容器
   * @returns void
   */
  override register(container: IContainer): void {
    // 註冊 Repository
    container.singleton('productRepository', () => {
      const registry = getRegistry()
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return registry.create('product', orm, db)
    })

    // 註冊查詢服務 (CQRS Read Side)
    container.singleton('productQueryService', () => {
      return new ProductQueryService(getDatabaseAccess())
    })

    // 註冊應用層服務
    container.singleton('createProductService', (c) => {
      const productRepository = c.make('productRepository')
      return new CreateProductService(productRepository)
    })

    container.singleton('getProductService', (c) => {
      const productRepository = c.make('productRepository')
      return new GetProductService(productRepository)
    })
  }
}
