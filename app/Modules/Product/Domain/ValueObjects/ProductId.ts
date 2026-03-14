/**
 * @file ProductId.ts
 * @description 產品唯一識別碼值物件 (Value Object)
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'
import { v4 as uuid } from 'uuid'

interface ProductIdProps extends Record<string, unknown> {
  readonly value: string
}

/**
 * 產品 ID 值物件
 * @class ProductId
 * @extends ValueObject
 */
export class ProductId extends ValueObject<ProductIdProps> {
  /**
   * 私有建構函數
   * @param {ProductIdProps} props 屬性
   */
  private constructor(props: ProductIdProps) {
    super(props)
  }

  /**
   * 建立新的產品 ID
   * @param {string} [value] 選擇性的 ID 字串，若未提供則自動生成 UUID
   * @returns {ProductId} 產品 ID 實例
   * @throws {Error} 當格式無效時拋出錯誤
   */
  static create(value?: string): ProductId {
    const id = value || uuid()
    ProductId.validate(id)
    return new ProductId({ value: id })
  }

  /**
   * 從現有值重構產品 ID
   * @param {string} value ID 字串
   * @returns {ProductId} 產品 ID 實例
   * @throws {Error} 當格式無效時拋出錯誤
   */
  static reconstitute(value: string): ProductId {
    ProductId.validate(value)
    return new ProductId({ value })
  }

  /**
   * 驗證 ID 格式
   * @param {string} value ID 字串
   * @private
   * @throws {Error} 當格式無效時拋出錯誤
   */
  private static validate(value: string): void {
    if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      throw new Error('Invalid ProductId format')
    }
  }

  /**
   * 取得 ID 值
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
