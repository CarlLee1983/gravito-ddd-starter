/**
 * SKU Value Object
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface SKUProps extends Record<string, unknown> {
  readonly value: string
}

export class SKU extends ValueObject<SKUProps> {
  private constructor(props: SKUProps) {
    super(props)
  }

  static create(sku: string): SKU {
    const normalized = sku.trim().toUpperCase()

    if (normalized.length < 3) {
      throw new Error(`SKU 長度至少需要 3 個字元，目前：${normalized.length}`)
    }

    if (normalized.length > 50) {
      throw new Error(`SKU 長度不能超過 50 個字元，目前：${normalized.length}`)
    }

    const skuRegex = /^[A-Z0-9\-]+$/
    if (!skuRegex.test(normalized)) {
      throw new Error(`SKU 只允許大寫字母、數字和連字符`)
    }

    return new SKU({ value: normalized })
  }

  get value(): string {
    return this.props.value
  }

  toString(): string {
    return this.props.value
  }
}
