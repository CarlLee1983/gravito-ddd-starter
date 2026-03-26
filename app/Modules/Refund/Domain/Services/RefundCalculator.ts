import type { ReturnItem } from '../Entities/ReturnItem'
import type { OrderContext } from '../ValueObjects/OrderContext'
import type { RefundFees } from '../ValueObjects/RefundFees'
import { RefundCalculation } from '../ValueObjects/RefundCalculation'
import type { ItemRefundBreakdown } from '../ValueObjects/RefundCalculation'

/**
 * 退款金額計算 Domain Service — 計算退款金額並分攤折扣
 *
 * 無狀態純函數，輸入退貨項目、訂單上下文與費率設定，輸出完整計算結果。
 */
export class RefundCalculator {
	/**
	 * 計算退款金額
	 *
	 * 折扣按各商品金額佔訂單總額的比例分攤，費用豁免邏輯由 RefundFees 設定決定。
	 *
	 * @param items - 退貨項目列表（唯讀）
	 * @param orderContext - 訂單快照資訊（含折扣、幣別）
	 * @param fees - 費用設定（補貨費率、運費、豁免原因）
	 * @returns RefundCalculation — 完整退款金額明細
	 */
	calculate(
		items: readonly ReturnItem[],
		orderContext: OrderContext,
		fees: RefundFees
	): RefundCalculation {
		const breakdown: ItemRefundBreakdown[] = []
		let subtotalCents = 0

		for (const item of items) {
			const itemTotalCents = item.originalPrice.cents * item.quantity

			const proportion =
				orderContext.totalAmountCents > 0
					? itemTotalCents / orderContext.totalAmountCents
					: 0

			const discountShareCents = Math.round(
				orderContext.discountAmountCents * proportion
			)

			const adjustedPriceCents = itemTotalCents - discountShareCents

			subtotalCents += adjustedPriceCents

			breakdown.push({
				productId: item.productId,
				originalPriceCents: item.originalPrice.cents,
				discountShareCents,
				adjustedPriceCents,
				quantity: item.quantity,
			})
		}

		const isWaived = items.some((item) => fees.waivedReasons.includes(item.reason.value))

		const restockingFeeCents = isWaived
			? 0
			: Math.round(subtotalCents * fees.restockingFeeRate)

		const shippingFeeCents = isWaived ? 0 : fees.shippingFeeCents

		return RefundCalculation.create(
			subtotalCents,
			restockingFeeCents,
			shippingFeeCents,
			orderContext.currency,
			breakdown
		)
	}
}
