/**
 * Price Value Object
 */

import { ValueObject } from '@/Shared/Domain/ValueObject'

export enum Currency {
  TWD = 'TWD',
  USD = 'USD',
  EUR = 'EUR',
  JPY = 'JPY',
  CNY = 'CNY'
}

interface PriceProps extends Record<string, unknown> {
  readonly amount: number
  readonly currency: Currency
}

export class Price extends ValueObject<PriceProps> {
  private constructor(props: PriceProps) {
    super(props)
  }

  static create(amount: number, currency: Currency): Price {
    if (amount < 0) {
      throw new Error(`價格不能為負數，目前：${amount}`)
    }

    if (!Object.values(Currency).includes(currency)) {
      throw new Error(`無效的貨幣類型：${currency}`)
    }

    return new Price({ amount, currency })
  }

  get amount(): number {
    return this.props.amount
  }

  get currency(): Currency {
    return this.props.currency
  }

  toString(): string {
    return `${this.props.amount} ${this.props.currency}`
  }
}
