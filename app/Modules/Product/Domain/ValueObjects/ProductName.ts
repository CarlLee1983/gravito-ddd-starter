/**
 * ProductName Value Object
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface ProductNameProps extends Record<string, unknown> {
  readonly value: string
}

export class ProductName extends ValueObject<ProductNameProps> {
  private constructor(props: ProductNameProps) {
    super(props)
  }

  static create(name: string): ProductName {
    const trimmed = name.trim()

    if (trimmed.length === 0) {
      throw new Error('產品名稱不能只包含空格')
    }

    if (trimmed.length < 1) {
      throw new Error(`產品名稱長度至少需要 1 個字元，目前：${trimmed.length}`)
    }

    if (trimmed.length > 200) {
      throw new Error(`產品名稱長度不能超過 200 個字元，目前：${trimmed.length}`)
    }

    return new ProductName({ value: trimmed })
  }

  get value(): string {
    return this.props.value
  }

  toString(): string {
    return this.props.value
  }
}
