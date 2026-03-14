/**
 * @file Title.ts
 * @description 文章標題值物件
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'

interface TitleProps extends Record<string, unknown> {
  readonly value: string
}

/**
 * Title Value Object
 *
 * 代表文章的標題。
 * 作為值物件，具有不可變性、驗證邏輯和結構相等性。
 */
export class Title extends ValueObject<TitleProps> {
  private constructor(props: TitleProps) {
    super(props)
  }

  /**
   * 建立 Title ValueObject
   *
   * 執行驗證和規範化：
   * - 移除前後空白
   * - 驗證長度（1-255 字元）
   *
   * @param title - 標題字串
   * @returns Title 實例
   * @throws Error 如果格式無效
   */
  static create(title: string): Title {
    const trimmed = title.trim()

    // 驗證長度
    if (trimmed.length === 0) {
      throw new Error('文章標題不能為空')
    }

    if (trimmed.length > 255) {
      throw new Error(`文章標題長度不能超過 255 個字元，目前：${trimmed.length}`)
    }

    return new Title({ value: trimmed })
  }

  /**
   * 取得標題值
   */
  get value(): string {
    return this.props.value
  }

  /**
   * 轉換為字串
   *
   * @returns 標題字串
   */
  toString(): string {
    return this.props.value
  }
}
