import { randomUUID } from 'crypto'

/**
 * 支付唯一標識符值物件
 */
export class PaymentId {
	private readonly _value: string

	constructor(value?: string) {
		this._value = value || randomUUID()
	}

	get value(): string {
		return this._value
	}

	static from(value: string): PaymentId {
		return new PaymentId(value)
	}

	equals(other: PaymentId): boolean {
		return this._value === other._value
	}

	toString(): string {
		return this._value
	}
}
