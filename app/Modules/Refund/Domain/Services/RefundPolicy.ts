import type { Refund } from '../Entities/Refund'
import type { OrderContext } from '../ValueObjects/OrderContext'
import type { RefundPolicyConfig } from '../ValueObjects/RefundPolicyConfig'
import { PolicyDecision } from '../ValueObjects/PolicyDecision'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * 退款政策 Domain Service — 評估退款申請是否符合自動核准條件
 *
 * 無狀態純函數，輸入退款資料、訂單上下文與設定，輸出政策決策。
 */
export class RefundPolicy {
	/**
	 * 評估退款申請，決定是自動核准或需人工審核
	 *
	 * @param refund - 退款申請
	 * @param orderContext - 訂單快照資訊
	 * @param recentRefundCount - 使用者近期退款次數
	 * @param config - 退款政策設定
	 * @returns PolicyDecision — auto 或 manual
	 */
	evaluate(
		refund: Refund,
		orderContext: OrderContext,
		recentRefundCount: number,
		config: RefundPolicyConfig
	): PolicyDecision {
		const now = Date.now()
		const daysSinceOrder = Math.floor(
			(now - orderContext.orderDate.getTime()) / MS_PER_DAY
		)

		const totalRefundCents = refund.items.reduce(
			(sum, item) => sum + item.originalPrice.cents * item.quantity,
			0
		)

		const allReasonsAllowed = refund.items.every((item) =>
			config.autoApprovalReasons.includes(item.reason.value)
		)

		const withinDays = daysSinceOrder <= config.maxAutoApprovalDays
		const withinAmount = totalRefundCents <= config.maxAutoApprovalAmountCents
		const withinRefundLimit = recentRefundCount <= config.maxRecentRefunds

		if (allReasonsAllowed && withinDays && withinAmount && withinRefundLimit) {
			return PolicyDecision.auto('all_conditions_met')
		}

		const reasons: string[] = []
		if (!withinDays) {
			reasons.push(`超過自動核准天數限制 (${daysSinceOrder} > ${config.maxAutoApprovalDays})`)
		}
		if (!withinAmount) {
			reasons.push(`超過自動核准金額限制 (${totalRefundCents} > ${config.maxAutoApprovalAmountCents})`)
		}
		if (!withinRefundLimit) {
			reasons.push(`超過近期退款次數限制 (${recentRefundCount} > ${config.maxRecentRefunds})`)
		}
		if (!allReasonsAllowed) {
			const disallowedReasons = refund.items
				.filter((item) => !config.autoApprovalReasons.includes(item.reason.value))
				.map((item) => item.reason.value)
				.join(', ')
			reasons.push(`退款原因不符自動核准條件: ${disallowedReasons}`)
		}

		return PolicyDecision.manual('system', reasons.join('; '))
	}
}
