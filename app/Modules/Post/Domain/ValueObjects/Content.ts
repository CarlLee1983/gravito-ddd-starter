/**
 * @file Content.ts
 * @description 文章內容值物件
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface ContentProps extends Record<string, unknown> {
  readonly value: string
}

/**
 * Content Value Object
 *
 * 代表文章的內容。
 * 作為值物件，具有不可變性、驗證邏輯和結構相等性。
 * 內容是選填的，允許創建僅有標題的文章。
 */
export class Content extends ValueObject<ContentProps> {
  private constructor(props: ContentProps) {
    super(props)
  }

  /**
   * 建立 Content ValueObject
   *
   * 執行驗證和規範化：
   * - 移除前後空白
   * - 驗證長度（0-10000 字元，允許空值）
   * - 允許 undefined 或空字串作為選填內容
   *
   * @param content - 內容字串（選填）
   * @returns Content 實例
   * @throws Error 如果內容超長
   */
  static create(content?: string): Content {
    // 允許 undefined 或空字串
    if (!content) {
      return new Content({ value: '' })
    }

    const trimmed = content.trim()

    // 驗證長度
    if (trimmed.length > 10000) {
      throw new Error(`文章內容長度不能超過 10000 個字元，目前：${trimmed.length}`)
    }

    return new Content({ value: trimmed })
  }

  /**
   * 檢查內容是否為空
   *
   * @returns 如果內容為空或空白，返回 true
   */
  isEmpty(): boolean {
    return this.props.value.length === 0
  }

  /**
   * 取得內容字數（不計空白）
   *
   * @returns 實際字數
   */
  getLength(): number {
    return this.props.value.length
  }

  /**
   * 取得內容值
   */
  get value(): string {
    return this.props.value
  }

  /**
   * 轉換為字串
   *
   * @returns 內容字串
   */
  toString(): string {
    return this.props.value
  }
}
