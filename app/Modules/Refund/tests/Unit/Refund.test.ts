import { describe, it, expect, beforeEach } from 'bun:test'
import { Refund } from '../../Domain/Entities/Refund'
import { Money } from '../../Domain/ValueObjects/Money'
import { RefundType } from '../../Domain/ValueObjects/RefundType'
import { RefundStatus } from '../../Domain/ValueObjects/RefundStatus'
import { RefundReason } from '../../Domain/ValueObjects/RefundReason'
import { ItemCondition } from '../../Domain/ValueObjects/ItemCondition'
import { PolicyDecision } from '../../Domain/ValueObjects/PolicyDecision'
import { RefundCalculation } from '../../Domain/ValueObjects/RefundCalculation'

// 測試輔助：建立單一退款 item 參數
function makeItemParam(overrides: Partial<{
	productId: string
	productName: string
	originalPrice: Money
	quantity: number
	reason: RefundReason
}> = {}) {
	return {
		productId: 'product-001',
		productName: '測試商品 A',
		originalPrice: Money.fromDollars(300, 'TWD'),
		quantity: 1,
		reason: RefundReason.defective(),
		...overrides,
	}
}

// 測試輔助：建立標準 RefundOnly 退款
function createRefundOnly() {
	return Refund.create({
		orderId: 'order-001',
		userId: 'user-001',
		type: RefundType.refundOnly(),
		items: [makeItemParam()],
	})
}

// 測試輔助：建立標準 ReturnAndRefund 退款
function createReturnAndRefund() {
	return Refund.create({
		orderId: 'order-002',
		userId: 'user-002',
		type: RefundType.returnAndRefund(),
		items: [
			makeItemParam({ productId: 'product-001', quantity: 2 }),
			makeItemParam({ productId: 'product-002', productName: '測試商品 B', quantity: 1 }),
		],
	})
}

// ─────────────────────────────────────────────
// 1. 建立退款申請
// ─────────────────────────────────────────────
describe('建立退款申請', () => {
	it('RefundOnly — 建立成功，狀態為 requested，包含 RefundRequested 事件', () => {
		const refund = createRefundOnly()

		expect(refund.status.value).toBe('requested')
		expect(refund.orderId).toBe('order-001')
		expect(refund.userId).toBe('user-001')
		expect(refund.type.isRefundOnly()).toBe(true)
		expect(refund.items).toHaveLength(1)
		expect(refund.resolvedAt).toBeNull()

		const events = refund.getUncommittedEvents()
		expect(events).toHaveLength(1)
		expect(events[0].eventType).toBe('RefundRequested')
		expect((events[0].data as any).orderId).toBe('order-001')
		expect((events[0].data as any).itemCount).toBe(1)
	})

	it('ReturnAndRefund — 建立成功，包含 2 個 items，discountShare 預設為 zero', () => {
		const refund = createReturnAndRefund()

		expect(refund.type.isReturnAndRefund()).toBe(true)
		expect(refund.items).toHaveLength(2)

		for (const item of refund.items) {
			expect(item.discountShare.cents).toBe(0)
			expect(item.status).toBe('pending')
			expect(item.condition).toBeUndefined()
		}

		const events = refund.getUncommittedEvents()
		expect(events).toHaveLength(1)
		expect((events[0].data as any).itemCount).toBe(2)
	})

	it('refundId 應自動產生，每次都不同', () => {
		const r1 = createRefundOnly()
		const r2 = createRefundOnly()
		expect(r1.id).not.toBe(r2.id)
		expect(r1.refundId.value).not.toBe(r2.refundId.value)
	})

	it('requestedAt 應在建立時自動設定', () => {
		const before = new Date()
		const refund = createRefundOnly()
		const after = new Date()
		expect(refund.requestedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
		expect(refund.requestedAt.getTime()).toBeLessThanOrEqual(after.getTime())
	})
})

// ─────────────────────────────────────────────
// 2. 審核流程
// ─────────────────────────────────────────────
describe('審核流程', () => {
	it('submitForReview — requested → under_review', () => {
		const refund = createRefundOnly()
		refund.markEventsAsCommitted()

		refund.submitForReview()

		expect(refund.status.value).toBe('under_review')
		const events = refund.getUncommittedEvents()
		expect(events).toHaveLength(0) // submitForReview 不發出事件（無事件規格）
	})

	it('approve(auto decision) — under_review → approved，發出 RefundApproved + RefundAutoApproved', () => {
		const refund = createRefundOnly()
		refund.markEventsAsCommitted()
		refund.submitForReview()
		refund.markEventsAsCommitted()

		const decision = PolicyDecision.auto('rule-001')
		refund.approve(decision)

		expect(refund.status.value).toBe('approved')
		expect(refund.policy).not.toBeNull()

		const events = refund.getUncommittedEvents()
		const eventTypes = events.map((e) => e.eventType)
		expect(eventTypes).toContain('RefundApproved')
		expect(eventTypes).toContain('RefundAutoApproved')
	})

	it('approve(manual decision) — under_review → approved，只發出 RefundApproved', () => {
		const refund = createRefundOnly()
		refund.markEventsAsCommitted()
		refund.submitForReview()
		refund.markEventsAsCommitted()

		const decision = PolicyDecision.manual('reviewer-001', '審核通過')
		refund.approve(decision)

		expect(refund.status.value).toBe('approved')

		const events = refund.getUncommittedEvents()
		const eventTypes = events.map((e) => e.eventType)
		expect(eventTypes).toContain('RefundApproved')
		expect(eventTypes).not.toContain('RefundAutoApproved')
	})

	it('reject — under_review → rejected，記錄拒絕原因，設定 resolvedAt', () => {
		const refund = createRefundOnly()
		refund.markEventsAsCommitted()
		refund.submitForReview()
		refund.markEventsAsCommitted()

		refund.reject('reviewer-001', '不符合退款條件')

		expect(refund.status.value).toBe('rejected')
		expect(refund.rejectionNote).toBe('不符合退款條件')
		expect(refund.resolvedAt).not.toBeNull()

		const events = refund.getUncommittedEvents()
		expect(events).toHaveLength(1)
		expect(events[0].eventType).toBe('RefundRejected')
	})

	it('直接從 requested 呼叫 approve — 應拋出無效狀態轉換錯誤', () => {
		const refund = createRefundOnly()

		expect(() => {
			refund.approve(PolicyDecision.auto('rule-001'))
		}).toThrow('無效的狀態轉換')
	})

	it('直接從 requested 呼叫 reject — 應拋出無效狀態轉換錯誤', () => {
		const refund = createRefundOnly()

		expect(() => {
			refund.reject('reviewer-001', '拒絕原因')
		}).toThrow('無效的狀態轉換')
	})

	it('在 rejected 狀態再次呼叫 submitForReview — 應拋出錯誤', () => {
		const refund = createRefundOnly()
		refund.submitForReview()
		refund.reject('reviewer-001', '拒絕')
		refund.markEventsAsCommitted()

		expect(() => {
			refund.submitForReview()
		}).toThrow('無效的狀態轉換')
	})
})

// ─────────────────────────────────────────────
// 3. 退貨流程
// ─────────────────────────────────────────────
describe('退貨流程', () => {
	function buildApprovedReturnAndRefund() {
		const refund = createReturnAndRefund()
		refund.markEventsAsCommitted()
		refund.submitForReview()
		refund.markEventsAsCommitted()
		refund.approve(PolicyDecision.auto('rule-return'))
		refund.markEventsAsCommitted()
		return refund
	}

	it('markItemsShipped — approved → awaiting_return，所有 items 變為 shipped', () => {
		const refund = buildApprovedReturnAndRefund()

		refund.markItemsShipped('TRACK-001')

		expect(refund.status.value).toBe('awaiting_return')

		for (const item of refund.items) {
			expect(item.status).toBe('shipped')
		}

		const events = refund.getUncommittedEvents()
		expect(events).toHaveLength(1)
		expect(events[0].eventType).toBe('ReturnItemsShipped')
		expect((events[0].data as any).trackingNumber).toBe('TRACK-001')
	})

	it('markItemsShipped — 無追蹤號也可以', () => {
		const refund = buildApprovedReturnAndRefund()

		refund.markItemsShipped()

		expect(refund.status.value).toBe('awaiting_return')

		const events = refund.getUncommittedEvents()
		expect((events[0].data as any).trackingNumber).toBeNull()
	})

	it('confirmItemsReceived — awaiting_return → items_received，更新商品狀態與 condition', () => {
		const refund = buildApprovedReturnAndRefund()
		refund.markItemsShipped('TRACK-002')
		refund.markEventsAsCommitted()

		const conditions = refund.items.map((item) => ({
			returnItemId: item.id,
			condition: ItemCondition.good(),
		}))

		refund.confirmItemsReceived(conditions)

		expect(refund.status.value).toBe('items_received')

		for (const item of refund.items) {
			expect(item.status).toBe('received')
			expect(item.condition?.value).toBe('good')
		}

		const events = refund.getUncommittedEvents()
		expect(events).toHaveLength(1)
		expect(events[0].eventType).toBe('ReturnItemsReceived')
	})

	it('confirmItemsReceived — 部分商品損壞', () => {
		const refund = buildApprovedReturnAndRefund()
		refund.markItemsShipped()
		refund.markEventsAsCommitted()

		const items = refund.items
		const conditions = [
			{ returnItemId: items[0].id, condition: ItemCondition.good() },
			{ returnItemId: items[1].id, condition: ItemCondition.damaged() },
		]

		refund.confirmItemsReceived(conditions)

		expect(refund.items[0].condition?.value).toBe('good')
		expect(refund.items[1].condition?.value).toBe('damaged')
	})

	it('從 requested 直接呼叫 markItemsShipped — 應拋出錯誤', () => {
		const refund = createReturnAndRefund()

		expect(() => {
			refund.markItemsShipped()
		}).toThrow('無效的狀態轉換')
	})
})

// ─────────────────────────────────────────────
// 4. 退款處理
// ─────────────────────────────────────────────
describe('退款處理', () => {
	function buildApprovedRefundOnly() {
		const refund = createRefundOnly()
		refund.markEventsAsCommitted()
		refund.submitForReview()
		refund.markEventsAsCommitted()
		refund.approve(PolicyDecision.auto('rule-auto'))
		refund.markEventsAsCommitted()
		return refund
	}

	it('startProcessing — approved → processing，發出 RefundProcessing 事件', () => {
		const refund = buildApprovedRefundOnly()

		const amount = Money.fromDollars(300, 'TWD')
		refund.startProcessing(amount)

		expect(refund.status.value).toBe('processing')

		const events = refund.getUncommittedEvents()
		expect(events).toHaveLength(1)
		expect(events[0].eventType).toBe('RefundProcessing')
		expect((events[0].data as any).refundAmountCents).toBe(30000)
		expect((events[0].data as any).currency).toBe('TWD')
	})

	it('complete — processing → completed，設定 resolvedAt，發出 RefundCompleted 事件', () => {
		const refund = buildApprovedRefundOnly()
		refund.startProcessing(Money.fromDollars(300, 'TWD'))
		refund.markEventsAsCommitted()

		refund.complete()

		expect(refund.status.value).toBe('completed')
		expect(refund.resolvedAt).not.toBeNull()

		const events = refund.getUncommittedEvents()
		expect(events).toHaveLength(1)
		expect(events[0].eventType).toBe('RefundCompleted')
		expect((events[0].data as any).orderId).toBe('order-001')
	})

	it('fail — processing → failed，發出 RefundFailed 事件', () => {
		const refund = buildApprovedRefundOnly()
		refund.startProcessing(Money.fromDollars(300, 'TWD'))
		refund.markEventsAsCommitted()

		refund.fail('支付閘道逾時')

		expect(refund.status.value).toBe('failed')

		const events = refund.getUncommittedEvents()
		expect(events).toHaveLength(1)
		expect(events[0].eventType).toBe('RefundFailed')
		expect((events[0].data as any).reason).toBe('支付閘道逾時')
	})

	it('retry — failed → processing（重試），發出 RefundProcessing 事件', () => {
		const refund = buildApprovedRefundOnly()
		refund.startProcessing(Money.fromDollars(300, 'TWD'))
		refund.markEventsAsCommitted()
		refund.fail('支付閘道逾時')
		refund.markEventsAsCommitted()

		// failed → processing 是允許的轉換
		refund.startProcessing(Money.fromDollars(300, 'TWD'))

		expect(refund.status.value).toBe('processing')
		const events = refund.getUncommittedEvents()
		expect(events[0].eventType).toBe('RefundProcessing')
	})

	it('ReturnAndRefund 流程完整通過：approved → awaiting_return → items_received → processing → completed', () => {
		const refund = createReturnAndRefund()

		// 1. 申請 → 審核 → 通過
		refund.submitForReview()
		refund.approve(PolicyDecision.auto('rule-auto'))
		refund.markEventsAsCommitted()

		// 2. 退貨
		refund.markItemsShipped('TRACK-COMPLETE')
		refund.markEventsAsCommitted()

		const conditions = refund.items.map((item) => ({
			returnItemId: item.id,
			condition: ItemCondition.good(),
		}))
		refund.confirmItemsReceived(conditions)
		refund.markEventsAsCommitted()

		// 3. 處理退款
		refund.startProcessing(Money.fromDollars(600, 'TWD'))
		refund.markEventsAsCommitted()

		refund.complete()

		expect(refund.status.value).toBe('completed')
		expect(refund.resolvedAt).not.toBeNull()
	})

	it('setCalculation — 儲存退款計算結果', () => {
		const refund = buildApprovedRefundOnly()

		const calc = RefundCalculation.create(30000, 0, 0, 'TWD', [
			{
				productId: 'product-001',
				originalPriceCents: 30000,
				discountShareCents: 0,
				adjustedPriceCents: 30000,
				quantity: 1,
			},
		])

		refund.setCalculation(calc)

		expect(refund.calculation).not.toBeNull()
		expect(refund.calculation?.refundAmountCents).toBe(30000)
	})

	it('completed 狀態不能再 complete', () => {
		const refund = buildApprovedRefundOnly()
		refund.startProcessing(Money.fromDollars(300, 'TWD'))
		refund.markEventsAsCommitted()
		refund.complete()
		refund.markEventsAsCommitted()

		expect(() => {
			refund.complete()
		}).toThrow('無效的狀態轉換')
	})
})

// ─────────────────────────────────────────────
// 5. reconstitute
// ─────────────────────────────────────────────
describe('reconstitute', () => {
	it('從既有資料重建，不發出事件', () => {
		const refund = createRefundOnly()
		const refundId = refund.refundId
		const items = refund.items

		const reconstituted = Refund.reconstitute({
			id: refund.id,
			refundId,
			orderId: 'order-001',
			userId: 'user-001',
			type: RefundType.refundOnly(),
			status: RefundStatus.approved(),
			items,
			calculation: null,
			policy: PolicyDecision.auto('rule-x'),
			rejectionNote: null,
			requestedAt: refund.requestedAt,
			resolvedAt: null,
		})

		expect(reconstituted.status.value).toBe('approved')
		expect(reconstituted.getUncommittedEvents()).toHaveLength(0)
		expect(reconstituted.id).toBe(refund.id)
	})
})
