/**
 * @file ProductServiceProvider.ts
 * @description 產品 Service Provider (DI 容器配置)
 */

import type { Container } from '@gravito/core'
import { ProductRepository } from '../Persistence/ProductRepository'

export class ProductServiceProvider {
  static register(container: Container): void {
    // Repository
    container.singleton('productRepository', (c: any) => {
      const db = c.make('database')
      const eventDispatcher = c.make('eventDispatcher')
      const eventStore = c.make('eventStore')
      return new ProductRepository(db, eventDispatcher, eventStore)
    })
  }
}
