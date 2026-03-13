/**
 * @file registerProductRepositories.ts
 * @description 產品 Repository 工廠註冊
 */

import type { Container } from '@gravito/core'
import { ProductRepository } from '../Persistence/ProductRepository'

export function registerProductRepositories(container: any): void {
  container.bind('productRepository', () => {
    const db = container.make('database')
    const eventDispatcher = container.make('eventDispatcher')
    const eventStore = container.make('eventStore')
    return new ProductRepository(db, eventDispatcher, eventStore)
  })
}
