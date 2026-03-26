import { AggregateRoot } from '@/Foundation/Domain/AggregateRoot'
import type { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import { ReturnItem } from './ReturnItem'
import { Money } from '../ValueObjects/Money'
import { RefundId } from '../ValueObjects/RefundId'
import { RefundType } from '../ValueObjects/RefundType'
import { RefundStatus } from '../ValueObjects/RefundStatus'
import type { RefundReason } from '../ValueObjects/RefundReason'
import type { ItemCondition } from '../ValueObjects/ItemCondition'
import type { PolicyDecision } from '../ValueObjects/PolicyDecision'
import type { RefundCalculation } from '../ValueObjects/RefundCalculation'
import { RefundRequested } from '../Events/RefundRequested'
import { RefundApproved } from '../Events/RefundApproved'
import { RefundAutoApproved } from '../Events/RefundAutoApproved'
import { RefundRejected } from '../Events/RefundRejected'
import { ReturnItemsShipped } from '../Events/ReturnItemsShipped'
import { ReturnItemsReceived } from '../Events/ReturnItemsReceived'
import { RefundProcessing } from '../Events/RefundProcessing'
import { RefundCompleted } from '../Events/RefundCompleted'
import { RefundFailed } from '../Events/RefundFailed'

interface RefundCreateParams {
	orderId: string
	userId: string
	type: RefundType
	items: Array<{
		productId: string
		productName: string
		originalPrice: Money
		quantity: number
		reason: RefundReason
	}>
}

interface RefundReconstituteParams {
	id: string
	refundId: RefundId
	orderId: string
	userId: string
	type: RefundType
	status: RefundStatus
	items: ReturnItem[]
	calculation: RefundCalculation | null
	policy: PolicyDecision | null
	rejectionNote: string | null
	requestedAt: Date
	resolvedAt: Date | null
}

/**
 * 退款聚合根 — 管理退款申請的完整生命週期
 *
 * 狀態機：
 * requested → under_review → approved → [awaiting_return → items_received →] processing → completed
 *                          ↘ rejected
 *                                                                              processing → failed → processing (重試)
 */
export class Refund extends AggregateRoot {
	private _refundId!: RefundId
	private _orderId!: string
	private _userId!: string
	private _type!: RefundType
	private _status!: RefundStatus
	private _items!: ReturnItem[]
	private _calculation: RefundCalculation | null = null
	private _policy: PolicyDecision | null = null
	private _rejectionNote: string | null = null
	private _requestedAt!: Date
	private _resolvedAt: Date | null = null

	private constructor(id: string) {
		super(id)
	}

	/** 建立新退款申請，發出 RefundRequested 事件 */
	static create(params: RefundCreateParams): Refund {
		const refundId = RefundId.create()
		const refund = new Refund(refundId.value)

		const items = params.items.map((itemParam) =>
			ReturnItem.create({
				productId: itemParam.productId,
				productName: itemParam.productName,
				originalPrice: itemParam.originalPrice,
				discountShare: Money.zero(itemParam.originalPrice.currency),
				quantity: itemParam.quantity,
				reason: itemParam.reason,
			})
		)

		refund._refundId = refundId
		refund._orderId = params.orderId
		refund._userId = params.userId
		refund._type = params.type
		refund._status = RefundStatus.requested()
		refund._items = items
		refund._requestedAt = new Date()

		refund.raiseEvent(
			new RefundRequested(
				refundId.value,
				params.orderId,
				params.userId,
				params.type.value,
				items.length
			)
		)

		return refund
	}

	/** 從既有資料重建，不發出事件 */
	static reconstitute(params: RefundReconstituteParams): Refund {
		const refund = new Refund(params.id)
		refund._refundId = params.refundId
		refund._orderId = params.orderId
		refund._userId = params.userId
		refund._type = params.type
		refund._status = params.status
		refund._items = [...params.items]
		refund._calculation = params.calculation
		refund._policy = params.policy
		refund._rejectionNote = params.rejectionNote
		refund._requestedAt = params.requestedAt
		refund._resolvedAt = params.resolvedAt
		return refund
	}

	// ── Getters ──────────────────────────────────────────────

	get refundId(): RefundId {
		return this._refundId
	}

	get orderId(): string {
		return this._orderId
	}

	get userId(): string {
		return this._userId
	}

	get type(): RefundType {
		return this._type
	}

	get status(): RefundStatus {
		return this._status
	}

	get items(): ReturnItem[] {
		return [...this._items]
	}

	get calculation(): RefundCalculation | null {
		return this._calculation
	}

	get policy(): PolicyDecision | null {
		return this._policy
	}

	get rejectionNote(): string | null {
		return this._rejectionNote
	}

	get requestedAt(): Date {
		return this._requestedAt
	}

	get resolvedAt(): Date | null {
		return this._resolvedAt
	}

	// ── 業務方法 ─────────────────────────────────────────────

	/** 提交審核：requested → under_review */
	submitForReview(): void {
		this.assertTransition(RefundStatus.underReview())
		this._status = RefundStatus.underReview()
	}

	/** 審核通過：under_review → approved */
	approve(decision: PolicyDecision): void {
		this.assertTransition(RefundStatus.approved())
		this._status = RefundStatus.approved()
		this._policy = decision

		this.raiseEvent(new RefundApproved(this._refundId.value, decision.type))

		if (decision.isAuto()) {
			this.raiseEvent(new RefundAutoApproved(this._refundId.value, decision.rule ?? ''))
		}
	}

	/** 審核拒絕：under_review → rejected */
	reject(reviewerId: string, note: string): void {
		this.assertTransition(RefundStatus.rejected())
		this._status = RefundStatus.rejected()
		this._rejectionNote = note
		this._resolvedAt = new Date()

		this.raiseEvent(new RefundRejected(this._refundId.value, reviewerId, note))
	}

	/** 標記退貨已出貨：approved → awaiting_return */
	markItemsShipped(trackingNumber?: string): void {
		this.assertTransition(RefundStatus.awaitingReturn())
		this._status = RefundStatus.awaitingReturn()

		for (const item of this._items) {
			item.markShipped()
		}

		this.raiseEvent(new ReturnItemsShipped(this._refundId.value, trackingNumber ?? null))
	}

	/** 確認退貨已收到：awaiting_return → items_received */
	confirmItemsReceived(
		conditions: Array<{ returnItemId: string; condition: ItemCondition }>
	): void {
		this.assertTransition(RefundStatus.itemsReceived())
		this._status = RefundStatus.itemsReceived()

		for (const cond of conditions) {
			const item = this._items.find((i) => i.id === cond.returnItemId)
			if (item) {
				item.markReceived(cond.condition)
			}
		}

		const itemConditions = conditions.map((c) => ({
			returnItemId: c.returnItemId,
			condition: c.condition.value,
		}))

		this.raiseEvent(new ReturnItemsReceived(this._refundId.value, itemConditions))
	}

	/** 開始處理退款：approved 或 items_received 或 failed → processing */
	startProcessing(refundAmount: Money): void {
		this.assertTransition(RefundStatus.processing())
		this._status = RefundStatus.processing()

		this.raiseEvent(
			new RefundProcessing(this._refundId.value, refundAmount.cents, refundAmount.currency)
		)
	}

	/** 完成退款：processing → completed */
	complete(): void {
		this.assertTransition(RefundStatus.completed())

		const refundAmountCents = this._calculation?.refundAmountCents ?? 0
		const currency = this._calculation?.currency ?? 'TWD'

		this._status = RefundStatus.completed()
		this._resolvedAt = new Date()

		this.raiseEvent(
			new RefundCompleted(this._refundId.value, this._orderId, refundAmountCents, currency)
		)
	}

	/** 退款失敗：processing → failed */
	fail(reason: string): void {
		this.assertTransition(RefundStatus.failed())
		this._status = RefundStatus.failed()

		this.raiseEvent(new RefundFailed(this._refundId.value, reason))
	}

	/** 設定退款計算結果 */
	setCalculation(calc: RefundCalculation): void {
		this._calculation = calc
	}

	/** applyEvent — 狀態變更直接在業務方法中完成，此處為 no-op */
	applyEvent(_event: DomainEvent): void {
		// no-op：狀態在業務方法中直接更新
	}

	// ── 私有輔助 ─────────────────────────────────────────────

	/** 驗證狀態轉換是否合法，不合法時拋出錯誤 */
	private assertTransition(target: RefundStatus): void {
		if (!this._status.canTransitionTo(target)) {
			throw new Error(
				`無效的狀態轉換: ${this._status.value} → ${target.value}`
			)
		}
	}
}
