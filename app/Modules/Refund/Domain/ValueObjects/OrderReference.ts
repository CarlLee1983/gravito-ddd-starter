import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface OrderReferenceProps extends Record<string, unknown> {
	readonly orderId: string
	readonly orderLineId: string
}

/**
 * 訂單參考值物件 — 指向特定訂單行的識別資訊
 */
export class OrderReference extends ValueObject<OrderReferenceProps> {
	private constructor(props: OrderReferenceProps) {
		super(props)
	}

	static create(orderId: string, orderLineId: string): OrderReference {
		return new OrderReference({ orderId, orderLineId })
	}

	get orderId(): string {
		return this.props.orderId
	}

	get orderLineId(): string {
		return this.props.orderLineId
	}

	toString(): string {
		return `OrderReference(orderId=${this.props.orderId}, orderLineId=${this.props.orderLineId})`
	}
}
