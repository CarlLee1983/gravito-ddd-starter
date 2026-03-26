import { BaseEntity } from '@/Foundation/Domain/BaseEntity'
import type { Money } from '../ValueObjects/Money'
import type { RefundReason } from '../ValueObjects/RefundReason'
import type { ItemCondition } from '../ValueObjects/ItemCondition'

type ReturnItemStatus = 'pending' | 'shipped' | 'received' | 'inspected'

interface ReturnItemCreateParams {
	productId: string
	productName: string
	originalPrice: Money
	discountShare: Money
	quantity: number
	reason: RefundReason
}

interface ReturnItemReconstituteParams extends ReturnItemCreateParams {
	id: string
	status: ReturnItemStatus
	condition?: ItemCondition
}

/**
 * 退貨項目子實體 — Refund 聚合根的子實體，非獨立聚合根
 */
export class ReturnItem extends BaseEntity {
	private _productId: string
	private _productName: string
	private _originalPrice: Money
	private _discountShare: Money
	private _quantity: number
	private _reason: RefundReason
	private _status: ReturnItemStatus
	private _condition: ItemCondition | undefined

	private constructor(
		id: string,
		productId: string,
		productName: string,
		originalPrice: Money,
		discountShare: Money,
		quantity: number,
		reason: RefundReason,
		status: ReturnItemStatus,
		condition?: ItemCondition
	) {
		super(id)
		this._productId = productId
		this._productName = productName
		this._originalPrice = originalPrice
		this._discountShare = discountShare
		this._quantity = quantity
		this._reason = reason
		this._status = status
		this._condition = condition
	}

	/** 建立新的退貨項目，狀態預設為 pending */
	static create(params: ReturnItemCreateParams): ReturnItem {
		return new ReturnItem(
			crypto.randomUUID(),
			params.productId,
			params.productName,
			params.originalPrice,
			params.discountShare,
			params.quantity,
			params.reason,
			'pending'
		)
	}

	/** 從既有資料重建，不改變狀態 */
	static reconstitute(params: ReturnItemReconstituteParams): ReturnItem {
		return new ReturnItem(
			params.id,
			params.productId,
			params.productName,
			params.originalPrice,
			params.discountShare,
			params.quantity,
			params.reason,
			params.status,
			params.condition
		)
	}

	get productId(): string {
		return this._productId
	}

	get productName(): string {
		return this._productName
	}

	get originalPrice(): Money {
		return this._originalPrice
	}

	get discountShare(): Money {
		return this._discountShare
	}

	get quantity(): number {
		return this._quantity
	}

	get reason(): RefundReason {
		return this._reason
	}

	get status(): ReturnItemStatus {
		return this._status
	}

	get condition(): ItemCondition | undefined {
		return this._condition
	}

	/** 標記為已出貨 */
	markShipped(): void {
		this._status = 'shipped'
	}

	/** 標記為已收到，並記錄商品狀態 */
	markReceived(condition: ItemCondition): void {
		this._status = 'received'
		this._condition = condition
	}

	/** 更新折扣分攤金額 */
	setDiscountShare(amount: Money): void {
		this._discountShare = amount
	}
}
