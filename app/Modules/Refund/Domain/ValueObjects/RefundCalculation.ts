import { ValueObject } from '@/Foundation/Domain/ValueObject'

export interface ItemRefundBreakdown {
	productId: string
	originalPriceCents: number
	discountShareCents: number
	adjustedPriceCents: number
	quantity: number
}

interface RefundCalculationProps extends Record<string, unknown> {
	readonly subtotalCents: number
	readonly restockingFeeCents: number
	readonly shippingFeeCents: number
	readonly totalDeductionsCents: number
	readonly refundAmountCents: number
	readonly currency: string
	readonly breakdown: readonly ItemRefundBreakdown[]
}

/**
 * 退款計算結果值物件 — 儲存完整的退款金額明細
 */
export class RefundCalculation extends ValueObject<RefundCalculationProps> {
	private constructor(props: RefundCalculationProps) {
		super(props)
	}

	static create(
		subtotalCents: number,
		restockingFeeCents: number,
		shippingFeeCents: number,
		currency: string,
		breakdown: ItemRefundBreakdown[]
	): RefundCalculation {
		const totalDeductionsCents = restockingFeeCents + shippingFeeCents
		const refundAmountCents = Math.max(0, subtotalCents - totalDeductionsCents)

		return new RefundCalculation({
			subtotalCents,
			restockingFeeCents,
			shippingFeeCents,
			totalDeductionsCents,
			refundAmountCents,
			currency,
			breakdown: Object.freeze([...breakdown]),
		})
	}

	get subtotalCents(): number {
		return this.props.subtotalCents
	}

	get restockingFeeCents(): number {
		return this.props.restockingFeeCents
	}

	get shippingFeeCents(): number {
		return this.props.shippingFeeCents
	}

	get totalDeductionsCents(): number {
		return this.props.totalDeductionsCents
	}

	get refundAmountCents(): number {
		return this.props.refundAmountCents
	}

	get currency(): string {
		return this.props.currency
	}

	get breakdown(): readonly ItemRefundBreakdown[] {
		return this.props.breakdown
	}

	toString(): string {
		return `RefundCalculation(refund=${this.props.currency} ${this.props.refundAmountCents}, deductions=${this.props.totalDeductionsCents})`
	}
}
