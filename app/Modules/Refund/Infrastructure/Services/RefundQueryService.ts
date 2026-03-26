/**
 * @file RefundQueryService.ts
 * @description 退款查詢服務實作 — 實現 IRefundQueryService（CQRS 讀側）
 *
 * 委派至 IRefundRepository，將 domain 物件映射為 DTO。
 */

import type { IRefundQueryService } from '../../Application/Queries/IRefundQueryService'
import type { IRefundRepository } from '../../Domain/Repositories/IRefundRepository'
import { toRefundDTO } from '../../Application/DTOs/RefundDTO'
import type { RefundDTO } from '../../Application/DTOs/RefundDTO'

/**
 * 退款查詢服務
 *
 * 提供 Presentation 層直接使用的查詢能力，支援分頁。
 */
export class RefundQueryService implements IRefundQueryService {
	constructor(private readonly refundRepository: IRefundRepository) {}

	/**
	 * 根據退款 ID 查詢單筆退款
	 */
	async getById(refundId: string): Promise<RefundDTO | null> {
		const refund = await this.refundRepository.findById(refundId)
		return refund ? toRefundDTO(refund) : null
	}

	/**
	 * 根據訂單 ID 查詢退款列表
	 */
	async getByOrderId(orderId: string): Promise<RefundDTO[]> {
		const refunds = await this.refundRepository.findByOrderId(orderId)
		return refunds.map(toRefundDTO)
	}

	/**
	 * 根據使用者 ID 查詢退款列表（支援分頁）
	 */
	async getByUserId(
		userId: string,
		pagination?: { limit?: number; offset?: number }
	): Promise<RefundDTO[]> {
		const refunds = await this.refundRepository.findByUserId(userId, pagination)
		return refunds.map(toRefundDTO)
	}

	/**
	 * 查詢待審核的退款列表（支援分頁）
	 */
	async getPendingReviews(
		pagination?: { limit?: number; offset?: number }
	): Promise<RefundDTO[]> {
		const refunds = await this.refundRepository.findByStatus('under_review', pagination)
		return refunds.map(toRefundDTO)
	}
}
