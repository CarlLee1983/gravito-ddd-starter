import type { RefundDTO } from '../DTOs/RefundDTO'

/**
 * 退款查詢服務 Port — CQRS 讀側，提供退款資料的查詢能力
 *
 * 定義在 Application 層，由 Infrastructure 層實現。
 * 支援分頁查詢，適合呈現層直接使用。
 */
export interface IRefundQueryService {
	/**
	 * 根據退款 ID 查詢單筆退款
	 */
	getById(refundId: string): Promise<RefundDTO | null>

	/**
	 * 根據訂單 ID 查詢退款列表
	 */
	getByOrderId(orderId: string): Promise<RefundDTO[]>

	/**
	 * 根據使用者 ID 查詢退款列表（支援分頁）
	 */
	getByUserId(
		userId: string,
		pagination?: { limit?: number; offset?: number }
	): Promise<RefundDTO[]>

	/**
	 * 查詢待審核的退款列表（支援分頁）
	 */
	getPendingReviews(pagination?: { limit?: number; offset?: number }): Promise<RefundDTO[]>
}
