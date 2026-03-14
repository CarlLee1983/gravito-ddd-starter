/**
 * @file TransactionId.ts
 * @description 交易編號值物件，封裝外部支付系統提供的流水號
 */

/**
 * 交易編號值物件 - 來自支付網關的唯一交易識別符
 */
export class TransactionId {
	private readonly _value: string

	/**
	 * @param value - 原始交易編號字串
	 * @throws Error 當交易編號為空或僅包含空格時
	 */
	constructor(value: string) {
		if (!value || value.trim().length === 0) {
			throw new Error('交易編號不能為空')
		}
		this._value = value
	}

	/** 獲取原始字串值 */
	get value(): string {
		return this._value
	}

	/**
	 * 靜態工廠方法
	 *
	 * @param value - 原始交易編號字串
	 * @returns 交易編號值物件實例
	 */
	static from(value: string): TransactionId {
		return new TransactionId(value)
	}

	/**
	 * 檢查兩個交易編號是否相等
	 *
	 * @param other - 另一個交易編號值物件
	 * @returns 是否相等
	 */
	equals(other: TransactionId): boolean {
		return this._value === other._value
	}

	/**
	 * 轉換為字串
	 *
	 * @returns 交易編號字串
	 */
	toString(): string {
		return this._value
	}
}
