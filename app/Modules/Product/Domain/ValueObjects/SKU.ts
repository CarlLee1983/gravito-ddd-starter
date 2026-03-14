/**
 * @file SKU.ts
 * @description 產品庫存單位 (Stock Keeping Unit) 值物件
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface SKUProps extends Record<string, unknown> {
  readonly value: string
}

/**
 * SKU 值物件
 * @class SKU
 * @extends ValueObject
 */
export class SKU extends ValueObject<SKUProps> {
  /**
   * 私有建構函數
   * @param {SKUProps} props 屬性
   */
  private constructor(props: SKUProps) {
    super(props)
  }

  /**
   * 建立 SKU 實例
   * @param {string} sku SKU 字串
   * @returns {SKU} SKU 實例
   * @throws {Error} 當 SKU 格式無效或長度不符時拋出錯誤
   */
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

  /**
   * 取得 SKU 值
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
