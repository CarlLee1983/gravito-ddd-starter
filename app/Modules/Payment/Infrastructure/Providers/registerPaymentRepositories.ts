/**
 * @file registerPaymentRepositories.ts
 * @description 註冊 Payment 模組的 Repository 建立工廠
 */

import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import { PaymentRepository } from '../Repositories/PaymentRepository'
import { RepositoryRegistry } from '@wiring/RepositoryRegistry'

/**
 * 註冊 Payment 模組的 Repository 到全局註冊表
 *
 * @param db - 資料庫存取介面
 */
export function registerPaymentRepositories(db: IDatabaseAccess, registry?: RepositoryRegistry): void {
	(if (!registry) throw new Error("RepositoryRegistry not provided"))
	registry.register('payment', () => {
		return new PaymentRepository(db)
	})
}
