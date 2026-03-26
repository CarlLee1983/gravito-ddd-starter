import { describe, it, expect } from 'bun:test'
import { RefundPolicy } from '../../Domain/Services/RefundPolicy'
import { Refund } from '../../Domain/Entities/Refund'
import { Money } from '../../Domain/ValueObjects/Money'
import { RefundType } from '../../Domain/ValueObjects/RefundType'
import { RefundReason } from '../../Domain/ValueObjects/RefundReason'
import { RefundPolicyConfig } from '../../Domain/ValueObjects/RefundPolicyConfig'
import { OrderContext } from '../../Domain/ValueObjects/OrderContext'

// ── 測試輔助函數 ──────────────────────────────────────────────

/**
 * 建立含單一退貨項目的 Refund
 */
function makeRefund(
	reason: RefundReason = RefundReason.defective(),
	priceCents = 5000
): Refund {
	return Refund.create({
		orderId: 'order-test',
		userId: 'user-test',
		type: RefundType.refundOnly(),
		items: [
			{
				productId: 'product-001',
				productName: '測試商品',
				originalPrice: Money.fromCents(priceCents, 'TWD'),
				quantity: 1,
				reason,
			},
		],
	})
}

/**
 * 建立訂單上下文，daysBefore 代表訂單在幾天前成立
 */
function makeOrderContext(daysBefore = 1, totalCents = 20000): OrderContext {
	const orderDate = new Date(Date.now() - daysBefore * 24 * 60 * 60 * 1000)
	return OrderContext.create({
		orderId: 'order-test',
		orderDate,
		totalAmountCents: totalCents,
		discountAmountCents: 0,
		currency: 'TWD',
		paymentMethod: 'credit_card',
		items: [],
	})
}

// ── 測試本體 ─────────────────────────────────────────────────

const policy = new RefundPolicy()

describe('RefundPolicy.evaluate()', () => {
	it('所有條件符合 → 自動核准', () => {
		const refund = makeRefund(RefundReason.defective(), 5000)
		const orderContext = makeOrderContext(3, 20000) // 3 天前
		const config = RefundPolicyConfig.defaults() // maxDays=7, maxAmount=10000, maxRefunds=3

		const decision = policy.evaluate(refund, orderContext, 1, config)

		expect(decision.isAuto()).toBe(true)
		expect(decision.rule).toBe('all_conditions_met')
	})

	it('超過 7 天 → 需人工審核', () => {
		const refund = makeRefund(RefundReason.defective(), 5000)
		const orderContext = makeOrderContext(8, 20000) // 8 天前
		const config = RefundPolicyConfig.defaults()

		const decision = policy.evaluate(refund, orderContext, 1, config)

		expect(decision.isAuto()).toBe(false)
		expect(decision.isManual()).toBe(true)
		expect(decision.note).toContain('超過自動核准天數限制')
	})

	it('金額超過 10000 分 → 需人工審核', () => {
		const refund = makeRefund(RefundReason.defective(), 15000) // 15000 分
		const orderContext = makeOrderContext(3, 30000)
		const config = RefundPolicyConfig.defaults()

		const decision = policy.evaluate(refund, orderContext, 1, config)

		expect(decision.isAuto()).toBe(false)
		expect(decision.note).toContain('超過自動核准金額限制')
	})

	it('近期退款次數超過 3 次 → 需人工審核', () => {
		const refund = makeRefund(RefundReason.defective(), 5000)
		const orderContext = makeOrderContext(3, 20000)
		const config = RefundPolicyConfig.defaults()

		const decision = policy.evaluate(refund, orderContext, 4, config) // 4 次 > 3

		expect(decision.isAuto()).toBe(false)
		expect(decision.note).toContain('超過近期退款次數限制')
	})

	it('退款原因為 other → 需人工審核', () => {
		const refund = makeRefund(RefundReason.other('其他特殊原因'), 5000)
		const orderContext = makeOrderContext(3, 20000)
		const config = RefundPolicyConfig.defaults() // autoApprovalReasons 不含 'other'

		const decision = policy.evaluate(refund, orderContext, 1, config)

		expect(decision.isAuto()).toBe(false)
		expect(decision.note).toContain('退款原因不符自動核准條件')
	})

	it('恰好在邊界條件（7 天、10000 分、3 次退款）→ 自動核准', () => {
		const refund = makeRefund(RefundReason.defective(), 10000) // exactly 10000 cents
		const orderContext = makeOrderContext(7, 20000) // exactly 7 days
		const config = RefundPolicyConfig.defaults()

		const decision = policy.evaluate(refund, orderContext, 3, config) // exactly 3

		expect(decision.isAuto()).toBe(true)
		expect(decision.rule).toBe('all_conditions_met')
	})
})
