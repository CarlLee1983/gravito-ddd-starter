import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface RefundIdProps extends Record<string, unknown> {
	readonly value: string
}

/**
 * 退款單識別碼值物件
 */
export class RefundId extends ValueObject<RefundIdProps> {
	private constructor(props: RefundIdProps) {
		super(props)
	}

	/** 自動產生 UUID */
	static create(): RefundId {
		return new RefundId({ value: crypto.randomUUID() })
	}

	/** 從既有字串建立 */
	static from(value: string): RefundId {
		return new RefundId({ value })
	}

	get value(): string {
		return this.props.value
	}

	toString(): string {
		return this.props.value
	}
}
