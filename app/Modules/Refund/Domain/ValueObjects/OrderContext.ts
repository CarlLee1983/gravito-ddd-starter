import { ValueObject } from '@/Foundation/Domain/ValueObject'

export interface OrderLineSnapshot {
	orderLineId: string
	productId: string
	productName: string
	unitPriceCents: number
	quantity: number
}

interface OrderContextProps extends Record<string, unknown> {
	readonly orderId: string
	readonly orderDate: string
	readonly totalAmountCents: number
	readonly discountAmountCents: number
	readonly currency: string
	readonly paymentMethod: string
	readonly items: readonly OrderLineSnapshot[]
}

interface OrderContextParams {
	orderId: string
	orderDate: Date
	totalAmountCents: number
	discountAmountCents: number
	currency: string
	paymentMethod: string
	items: OrderLineSnapshot[]
}

/**
 * 訂單上下文值物件 — 退款時的訂單快照資訊
 */
export class OrderContext extends ValueObject<OrderContextProps> {
	private constructor(props: OrderContextProps) {
		super(props)
	}

	static create(params: OrderContextParams): OrderContext {
		return new OrderContext({
			orderId: params.orderId,
			orderDate: params.orderDate.toISOString(),
			totalAmountCents: params.totalAmountCents,
			discountAmountCents: params.discountAmountCents,
			currency: params.currency,
			paymentMethod: params.paymentMethod,
			items: Object.freeze([...params.items]),
		})
	}

	get orderId(): string {
		return this.props.orderId
	}

	/** 回傳 Date 物件（從 ISO 字串轉換） */
	get orderDate(): Date {
		return new Date(this.props.orderDate)
	}

	get totalAmountCents(): number {
		return this.props.totalAmountCents
	}

	get discountAmountCents(): number {
		return this.props.discountAmountCents
	}

	get currency(): string {
		return this.props.currency
	}

	get paymentMethod(): string {
		return this.props.paymentMethod
	}

	get items(): readonly OrderLineSnapshot[] {
		return this.props.items
	}

	toString(): string {
		return `OrderContext(orderId=${this.props.orderId}, total=${this.props.currency} ${this.props.totalAmountCents})`
	}
}
