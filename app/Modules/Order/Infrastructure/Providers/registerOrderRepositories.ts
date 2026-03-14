/**
 * @file registerOrderRepositories.ts
 * @description Order 模組 Repository 工廠註冊
 */

import { OrderRepository } from '../Repositories/OrderRepository'
import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Infrastructure/Ports/Messaging/IEventDispatcher'
import { getRegistry } from '@wiring/RepositoryRegistry'

/**
 * 註冊 Order Repository 工廠到全局 Registry
 *
 * @param db - 資料庫存取介面實例 (port)
 * @param eventDispatcher - 事件分派器
 */
export function registerOrderRepositories(db: IDatabaseAccess, eventDispatcher?: IEventDispatcher): void {
  const registry = getRegistry()
  
  const factory = (_orm: string, _db: IDatabaseAccess | undefined) => {
    return new OrderRepository(db, eventDispatcher!)
  }

  registry.register('order', factory)
  console.log('✅ [Order] Repository 工廠已註冊')
}
