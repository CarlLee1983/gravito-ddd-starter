/**
 * @file registerProductRepositories.ts
 * @description 產品 Repository 工廠註冊
 */

import { ProductRepository } from '../Persistence/ProductRepository'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Shared/Infrastructure/Ports/Messaging/IEventDispatcher'
import { getRegistry } from '@wiring/RepositoryRegistry'

/**
 * 註冊 Product Repository 工廠到全局 Registry
 *
 * @param db - 資料庫存取介面實例 (port)
 * @param eventDispatcher - 事件分派器
 */
export function registerProductRepositories(db: IDatabaseAccess, eventDispatcher?: IEventDispatcher): void {
  const registry = getRegistry()
  
  const factory = (_orm: string, _db: IDatabaseAccess | undefined) => {
    return new ProductRepository(db, eventDispatcher)
  }

  registry.register('product', factory)
  console.log('✅ [Product] Repository 工廠已註冊')
}
