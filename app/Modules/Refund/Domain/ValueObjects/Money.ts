import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface MoneyProps extends Record<string, unknown> {
	readonly cents: number
	readonly currency: string
}

/**
 * 金額值物件 — 以整數分為內部儲存單位，避免浮點數精度問題
 */
export class Money extends ValueObject<MoneyProps> {
	private constructor(props: MoneyProps) {
		super(props)
	}

	/** 以分為單位建立 */
	static fromCents(cents: number, currency: string): Money {
		return new Money({ cents: Math.round(cents), currency })
	}

	/** 以元為單位建立（自動轉換為分） */
	static fromDollars(dollars: number, currency: string): Money {
		return new Money({ cents: Math.round(dollars * 100), currency })
	}

	/** 建立零金額 */
	static zero(currency: string): Money {
		return new Money({ cents: 0, currency })
	}

	get cents(): number {
		return this.props.cents
	}

	get currency(): string {
		return this.props.currency
	}

	/** 加法，回傳新 Money */
	add(other: Money): Money {
		this.assertSameCurrency(other)
		return new Money({ cents: this.cents + other.cents, currency: this.currency })
	}

	/** 減法，回傳新 Money */
	subtract(other: Money): Money {
		this.assertSameCurrency(other)
		return new Money({ cents: this.cents - other.cents, currency: this.currency })
	}

	/** 乘以比率，回傳新 Money */
	multiplyByRate(rate: number): Money {
		return new Money({ cents: Math.round(this.cents * rate), currency: this.currency })
	}

	private assertSameCurrency(other: Money): void {
		if (this.currency !== other.currency) {
			throw new Error('幣別不一致')
		}
	}

	toString(): string {
		return `${this.currency} ${this.cents}`
	}
}
