import type { IRepository } from '@/Foundation/Domain/IRepository'
import type { Refund } from '../Entities/Refund'

/**
 * 退款倉儲介面 — 定義退款聚合根的持久化契約
 *
 * 繼承通用 IRepository<Refund>，擴展退款模組特定查詢方法。
 * 實現位於 Infrastructure 層，Domain 層對 ORM 完全無感知。
 */
export interface IRefundRepository extends IRepository<Refund> {
	/**
	 * 根據訂單 ID 查詢所有退款申請
	 */
	findByOrderId(orderId: string): Promise<Refund[]>

	/**
	 * 根據使用者 ID 查詢退款申請（支援分頁）
	 */
	findByUserId(
		userId: string,
		params?: { limit?: number; offset?: number }
	): Promise<Refund[]>

	/**
	 * 根據退款狀態查詢（支援分頁）
	 */
	findByStatus(
		status: string,
		params?: { limit?: number; offset?: number }
	): Promise<Refund[]>
}
