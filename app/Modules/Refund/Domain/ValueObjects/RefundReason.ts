import { ValueObject } from '@/Foundation/Domain/ValueObject'

const VALID_REASONS = [
	'defective',
	'wrong_item',
	'not_as_described',
	'change_of_mind',
	'other',
] as const
type RefundReasonValue = (typeof VALID_REASONS)[number]

interface RefundReasonProps extends Record<string, unknown> {
	readonly value: RefundReasonValue
	readonly description?: string
}

/**
 * 退款原因值物件
 */
export class RefundReason extends ValueObject<RefundReasonProps> {
	private constructor(props: RefundReasonProps) {
		super(props)
	}

	/** 商品瑕疵 */
	static defective(): RefundReason {
		return new RefundReason({ value: 'defective' })
	}

	/** 商品錯誤 */
	static wrongItem(): RefundReason {
		return new RefundReason({ value: 'wrong_item' })
	}

	/** 與描述不符 */
	static notAsDescribed(): RefundReason {
		return new RefundReason({ value: 'not_as_described' })
	}

	/** 改變心意 */
	static changeOfMind(): RefundReason {
		return new RefundReason({ value: 'change_of_mind' })
	}

	/** 其他原因（需提供描述） */
	static other(description: string): RefundReason {
		return new RefundReason({ value: 'other', description })
	}

	/** 從字串建立，無效時拋出錯誤 */
	static from(value: string, description?: string): RefundReason {
		if (!VALID_REASONS.includes(value as RefundReasonValue)) {
			throw new Error(`無效的退款原因: ${value}，允許值: ${VALID_REASONS.join(', ')}`)
		}
		return new RefundReason({ value: value as RefundReasonValue, description })
	}

	get value(): RefundReasonValue {
		return this.props.value
	}

	get description(): string | undefined {
		return this.props.description
	}

	isOther(): boolean {
		return this.props.value === 'other'
	}

	toString(): string {
		return this.props.description
			? `${this.props.value}: ${this.props.description}`
			: this.props.value
	}
}
