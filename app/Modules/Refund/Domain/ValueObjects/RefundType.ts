import { ValueObject } from '@/Foundation/Domain/ValueObject'

const VALID_TYPES = ['refund_only', 'return_and_refund'] as const
type RefundTypeValue = (typeof VALID_TYPES)[number]

interface RefundTypeProps extends Record<string, unknown> {
	readonly value: RefundTypeValue
}

/**
 * 退款類型值物件
 * - refund_only: 僅退款（不需退回商品）
 * - return_and_refund: 退貨並退款
 */
export class RefundType extends ValueObject<RefundTypeProps> {
	private constructor(props: RefundTypeProps) {
		super(props)
	}

	/** 僅退款 */
	static refundOnly(): RefundType {
		return new RefundType({ value: 'refund_only' })
	}

	/** 退貨退款 */
	static returnAndRefund(): RefundType {
		return new RefundType({ value: 'return_and_refund' })
	}

	/** 從字串建立，無效時拋出錯誤 */
	static from(value: string): RefundType {
		if (!VALID_TYPES.includes(value as RefundTypeValue)) {
			throw new Error(`無效的退款類型: ${value}，允許值: ${VALID_TYPES.join(', ')}`)
		}
		return new RefundType({ value: value as RefundTypeValue })
	}

	get value(): RefundTypeValue {
		return this.props.value
	}

	isRefundOnly(): boolean {
		return this.props.value === 'refund_only'
	}

	isReturnAndRefund(): boolean {
		return this.props.value === 'return_and_refund'
	}

	toString(): string {
		return this.props.value
	}
}
