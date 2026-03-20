/**
 * @file registerPaymentRepositories.ts
 * @description 註冊 Payment 模組的 Repository 建立工廠
 */

import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Foundation/Application/Ports/IEventDispatcher'
import { PaymentRepository } from '../Repositories/PaymentRepository'
import { RepositoryRegistry } from '@wiring/RepositoryRegistry'

/**
 * 註冊 Payment 模組的 Repository 到全局註冊表
 *
 * @param db - 資料庫存取介面
 * @param eventDispatcher - 事件分派器（可選）
 * @param registry - Repository Registry 實例
 */
export function registerPaymentRepositories(db: IDatabaseAccess, eventDispatcher?: IEventDispatcher, registry?: RepositoryRegistry): void {
	if (!registry) throw new Error("RepositoryRegistry not provided")
	registry.register('payment', () => {
		return new PaymentRepository(db, eventDispatcher)
	})
}
