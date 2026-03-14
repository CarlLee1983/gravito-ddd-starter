/**
 * @file Amount.ts
 * @description 金額值物件，處理精確的貨幣計算
 */

/**
 * 金額值物件 - 金額單位為新台幣（單位：分）
 */
export class Amount {
	private readonly _cents: number // 金額以分為單位（避免浮點數問題）

	/**
	 * @param value - 金額分數（必須為正整數）
	 * @throws Error 當金額不是正整數時
	 */
	constructor(value: number) {
		if (!Number.isInteger(value) || value <= 0) {
			throw new Error('金額必須為正整數（單位：分）')
		}
		this._cents = value
	}

	/**
	 * 從新台幣元轉換為分
	 *
	 * @param dollars - 台幣金額（元）
	 * @returns 金額值物件實例
	 */
	static fromTWD(dollars: number): Amount {
		const cents = Math.round(dollars * 100)
		return new Amount(cents)
	}

	/** 取得金額分數 */
	get cents(): number {
		return this._cents
	}

	/** 取得金額元數（浮點） */
	get dollars(): number {
		return this._cents / 100
	}

	/**
	 * 檢查兩個金額是否相等
	 *
	 * @param other - 另一個金額值物件
	 * @returns 是否相等
	 */
	equals(other: Amount): boolean {
		return this._cents === other._cents
	}

	/**
	 * 檢查是否大於另一個金額
	 *
	 * @param other - 比較對象
	 * @returns 是否較大
	 */
	isGreaterThan(other: Amount): boolean {
		return this._cents > other._cents
	}

	/**
	 * 檢查是否小於另一個金額
	 *
	 * @param other - 比較對象
	 * @returns 是否較小
	 */
	isLessThan(other: Amount): boolean {
		return this._cents < other._cents
	}

	/**
	 * 加法運算
	 *
	 * @param other - 被加金額
	 * @returns 相加後的金額值物件
	 */
	plus(other: Amount): Amount {
		return new Amount(this._cents + other._cents)
	}

	/**
	 * 減法運算
	 *
	 * @param other - 被減金額
	 * @returns 相減後的金額值物件
	 * @throws Error 當餘額小於或等於零時
	 */
	minus(other: Amount): Amount {
		const result = this._cents - other._cents
		if (result <= 0) {
			throw new Error('金額不足，無法相減')
		}
		return new Amount(result)
	}

	/**
	 * 轉換為格式化字串
	 *
	 * @returns 台幣格式化字串
	 */
	toString(): string {
		return `NT$${this.dollars.toFixed(2)}`
	}
}
