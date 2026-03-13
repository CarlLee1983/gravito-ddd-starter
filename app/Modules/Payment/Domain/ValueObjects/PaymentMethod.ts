/**
 * 支付方式值物件 - 支援 5 種支付方式
 */
export type PaymentMethodType = 'CREDIT_CARD' | 'BANK_TRANSFER' | 'WALLET_TRANSFER' | 'LINE_PAY' | 'APPLE_PAY'

export class PaymentMethod {
	private readonly _type: PaymentMethodType

	constructor(type: PaymentMethodType) {
		this._type = type
	}

	get type(): PaymentMethodType {
		return this._type
	}

	static creditCard(): PaymentMethod {
		return new PaymentMethod('CREDIT_CARD')
	}

	static bankTransfer(): PaymentMethod {
		return new PaymentMethod('BANK_TRANSFER')
	}

	static walletTransfer(): PaymentMethod {
		return new PaymentMethod('WALLET_TRANSFER')
	}

	static linePay(): PaymentMethod {
		return new PaymentMethod('LINE_PAY')
	}

	static applePay(): PaymentMethod {
		return new PaymentMethod('APPLE_PAY')
	}

	static from(value: string): PaymentMethod {
		const type = value.toUpperCase() as PaymentMethodType
		const validMethods: PaymentMethodType[] = ['CREDIT_CARD', 'BANK_TRANSFER', 'WALLET_TRANSFER', 'LINE_PAY', 'APPLE_PAY']

		if (!validMethods.includes(type)) {
			throw new Error(`無效的支付方式: ${value}`)
		}
		return new PaymentMethod(type)
	}

	equals(other: PaymentMethod): boolean {
		return this._type === other._type
	}

	toString(): string {
		const labels: Record<PaymentMethodType, string> = {
			'CREDIT_CARD': '信用卡',
			'BANK_TRANSFER': '銀行轉帳',
			'WALLET_TRANSFER': '電子錢包',
			'LINE_PAY': 'LINE Pay',
			'APPLE_PAY': 'Apple Pay'
		}
		return labels[this._type]
	}
}
