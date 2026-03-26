import { ValueObject } from '@/Foundation/Domain/ValueObject'
import type { Money } from './Money'

interface RefundFeesProps extends Record<string, unknown> {
	readonly restockingFeeRate: number
	readonly shippingFeeCents: number
	readonly shippingFeeCurrency: string
	readonly waivedReasons: readonly string[]
}

/**
 * 退款費用值物件 — 包含補貨費率與運費資訊
 */
export class RefundFees extends ValueObject<RefundFeesProps> {
	private constructor(props: RefundFeesProps) {
		super(props)
	}

	static create(
		restockingFeeRate: number,
		shippingFee: Money,
		waivedReasons: string[]
	): RefundFees {
		return new RefundFees({
			restockingFeeRate,
			shippingFeeCents: shippingFee.cents,
			shippingFeeCurrency: shippingFee.currency,
			waivedReasons: Object.freeze([...waivedReasons]),
		})
	}

	get restockingFeeRate(): number {
		return this.props.restockingFeeRate
	}

	get shippingFeeCents(): number {
		return this.props.shippingFeeCents
	}

	get shippingFeeCurrency(): string {
		return this.props.shippingFeeCurrency
	}

	get waivedReasons(): readonly string[] {
		return this.props.waivedReasons
	}

	/** 檢查指定原因是否已豁免 */
	isWaived(reason: string): boolean {
		return this.props.waivedReasons.includes(reason)
	}

	toString(): string {
		return `RefundFees(restockingRate=${this.props.restockingFeeRate}, shipping=${this.props.shippingFeeCurrency} ${this.props.shippingFeeCents})`
	}
}
