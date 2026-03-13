/**
 * 金額值物件 - 金額單位為新台幣（單位：分）
 */
export class Amount {
	private readonly _cents: number // 金額以分為單位（避免浮點數問題）

	constructor(value: number) {
		if (!Number.isInteger(value) || value <= 0) {
			throw new Error('金額必須為正整數（單位：分）')
		}
		this._cents = value
	}

	/**
	 * 從新台幣元轉換為分
	 */
	static fromTWD(dollars: number): Amount {
		const cents = Math.round(dollars * 100)
		return new Amount(cents)
	}

	/**
	 * 取得金額分數
	 */
	get cents(): number {
		return this._cents
	}

	/**
	 * 取得金額元數（浮點）
	 */
	get dollars(): number {
		return this._cents / 100
	}

	equals(other: Amount): boolean {
		return this._cents === other._cents
	}

	isGreaterThan(other: Amount): boolean {
		return this._cents > other._cents
	}

	isLessThan(other: Amount): boolean {
		return this._cents < other._cents
	}

	plus(other: Amount): Amount {
		return new Amount(this._cents + other._cents)
	}

	minus(other: Amount): Amount {
		const result = this._cents - other._cents
		if (result <= 0) {
			throw new Error('金額不足，無法相減')
		}
		return new Amount(result)
	}

	toString(): string {
		return `NT$${this.dollars.toFixed(2)}`
	}
}
