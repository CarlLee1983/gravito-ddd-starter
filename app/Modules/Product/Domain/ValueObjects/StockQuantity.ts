/**
 * StockQuantity Value Object
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface StockQuantityProps extends Record<string, unknown> {
  readonly value: number
}

export class StockQuantity extends ValueObject<StockQuantityProps> {
  private constructor(props: StockQuantityProps) {
    super(props)
  }

  static create(quantity: number): StockQuantity {
    if (!Number.isInteger(quantity)) {
      throw new Error(`庫存數量必須是整數，目前：${quantity}`)
    }

    if (quantity < 0) {
      throw new Error(`庫存數量不能為負數，目前：${quantity}`)
    }

    return new StockQuantity({ value: quantity })
  }

  get value(): number {
    return this.props.value
  }

  isInStock(): boolean {
    return this.props.value > 0
  }

  toString(): string {
    return this.props.value.toString()
  }
}
