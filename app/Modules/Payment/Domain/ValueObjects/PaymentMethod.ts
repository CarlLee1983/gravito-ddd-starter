/**
 * @file PaymentMethod.ts
 * @description 支付方式值物件，封裝系統支援的支付途徑
 */

/**
 * 支付方式枚舉類型
 */
export type PaymentMethodType = 'CREDIT_CARD' | 'BANK_TRANSFER' | 'WALLET_TRANSFER' | 'LINE_PAY' | 'APPLE_PAY'

/**
 * 支付方式值物件 - 支援多種支付方式
 */
export class PaymentMethod {
	private readonly _type: PaymentMethodType

	/**
	 * @param type - 支付方式類型
	 */
	constructor(type: PaymentMethodType) {
		this._type = type
	}

	/** 獲取支付方式類型 */
	get type(): PaymentMethodType {
		return this._type
	}

	/** 建立「信用卡」支付方式 */
	static creditCard(): PaymentMethod {
		return new PaymentMethod('CREDIT_CARD')
	}

	/** 建立「銀行轉帳」支付方式 */
	static bankTransfer(): PaymentMethod {
		return new PaymentMethod('BANK_TRANSFER')
	}

	/** 建立「電子錢包」支付方式 */
	static walletTransfer(): PaymentMethod {
		return new PaymentMethod('WALLET_TRANSFER')
	}

	/** 建立「LINE Pay」支付方式 */
	static linePay(): PaymentMethod {
		return new PaymentMethod('LINE_PAY')
	}

	/** 建立「Apple Pay」支付方式 */
	static applePay(): PaymentMethod {
		return new PaymentMethod('APPLE_PAY')
	}

	/**
	 * 從字串建立支付方式
	 *
	 * @param value - 方式字串
	 * @returns 支付方式實例
	 * @throws Error 當字串不是有效的支付方式時
	 */
	static from(value: string): PaymentMethod {
		const type = value.toUpperCase() as PaymentMethodType
		const validMethods: PaymentMethodType[] = ['CREDIT_CARD', 'BANK_TRANSFER', 'WALLET_TRANSFER', 'LINE_PAY', 'APPLE_PAY']

		if (!validMethods.includes(type)) {
			throw new Error(`無效的支付方式: ${value}`)
		}
		return new PaymentMethod(type)
	}

	/**
	 * 檢查兩個支付方式是否相等
	 *
	 * @param other - 另一個支付方式值物件
	 * @returns 是否相等
	 */
	equals(other: PaymentMethod): boolean {
		return this._type === other._type
	}

	/**
	 * 轉換為可讀字串（繁體中文）
	 *
	 * @returns 支付方式名稱
	 */
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
