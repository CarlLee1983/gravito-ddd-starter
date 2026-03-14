/**
 * @file ProductName.ts
 * @description 產品名稱值物件 (Value Object)
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface ProductNameProps extends Record<string, unknown> {
  readonly value: string
}

/**
 * 產品名稱值物件
 * @class ProductName
 * @extends ValueObject
 */
export class ProductName extends ValueObject<ProductNameProps> {
  /**
   * 私有建構函數
   * @param {ProductNameProps} props 屬性
   */
  private constructor(props: ProductNameProps) {
    super(props)
  }

  /**
   * 建立產品名稱實例
   * @param {string} name 名稱字串
   * @returns {ProductName} 產品名稱實例
   * @throws {Error} 當名稱無效或長度不符時拋出錯誤
   */
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

  /**
   * 取得名稱值
   * @returns {string}
   */
  get value(): string {
    return this.props.value
  }

  /**
   * 轉換為字串
   * @returns {string}
   */
  toString(): string {
    return this.props.value
  }
}
