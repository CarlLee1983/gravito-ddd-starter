/**
 * @file registerOrderRepositories.ts
 * @description Order 模組倉儲 (Repository) 工廠註冊
 */

import { OrderRepository } from '../Repositories/OrderRepository'
import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Infrastructure/Ports/Messaging/IEventDispatcher'
import { RepositoryRegistry } from '@wiring/RepositoryRegistry'

/**
 * 註冊 Order Repository 工廠到全局註冊表 (Registry)
 * 
 * 此函數在系統啟動階段被調用，將 Order 模組的倉儲實例化邏輯註冊到基礎設施層的 Registry 中。
 * 支援多種 ORM 環境切換，並注入必要的資料庫存取與事件分派依賴。
 *
 * @param db - 資料庫存取介面實例 (port)
 * @param eventDispatcher - 領域事件分派器，用於在保存聚合根時發佈未分派的事件
 * @returns void
 */
export function registerOrderRepositories(db: IDatabaseAccess, eventDispatcher?: IEventDispatcher, registry?: RepositoryRegistry): void {
  (if (!registry) throw new Error("RepositoryRegistry not provided"))
  
  const factory = (_orm: string, _db: IDatabaseAccess | undefined) => {
    return new OrderRepository(db, eventDispatcher!)
  }

  registry.register('order', factory)
  console.log('✅ [Order] Repository 工廠已註冊')
}
