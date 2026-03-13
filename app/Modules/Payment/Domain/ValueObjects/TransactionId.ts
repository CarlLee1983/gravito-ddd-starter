/**
 * 交易編號值物件 - 來自支付網關的唯一交易識別符
 */
export class TransactionId {
	private readonly _value: string

	constructor(value: string) {
		if (!value || value.trim().length === 0) {
			throw new Error('交易編號不能為空')
		}
		this._value = value
	}

	get value(): string {
		return this._value
	}

	static from(value: string): TransactionId {
		return new TransactionId(value)
	}

	equals(other: TransactionId): boolean {
		return this._value === other._value
	}

	toString(): string {
		return this._value
	}
}
