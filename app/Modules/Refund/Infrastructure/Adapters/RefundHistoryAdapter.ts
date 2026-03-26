/**
 * @file RefundHistoryAdapter.ts
 * @description 退款歷史適配器 — 實現 IRefundHistoryPort
 *
 * 透過 IRefundRepository 查詢使用者近期退款數量，
 * 供 RefundPolicy 評估自動核准資格。
 */

import type { IRefundHistoryPort } from '../../Domain/Ports/IRefundHistoryPort'
import type { IRefundRepository } from '../../Domain/Repositories/IRefundRepository'

/**
 * 退款歷史查詢適配器
 *
 * 計算指定使用者在 N 天內的退款申請數量。
 */
export class RefundHistoryAdapter implements IRefundHistoryPort {
	constructor(private readonly refundRepository: IRefundRepository) {}

	/**
	 * 計算使用者在指定天數內的退款申請數量
	 *
	 * @param userId - 使用者 ID
	 * @param withinDays - 回顧天數
	 * @returns 退款申請數量
	 */
	async countRecentRefunds(userId: string, withinDays: number): Promise<number> {
		const refunds = await this.refundRepository.findByUserId(userId)

		const cutoffDate = new Date()
		cutoffDate.setDate(cutoffDate.getDate() - withinDays)

		return refunds.filter((refund) => refund.requestedAt >= cutoffDate).length
	}
}
