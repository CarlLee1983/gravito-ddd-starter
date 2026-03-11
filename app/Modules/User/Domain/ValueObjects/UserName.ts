/**
 * UserName Value Object
 *
 * 代表用戶的名稱。
 * 作為值物件，具有不可變性、驗證邏輯和結構相等性。
 */

import { ValueObject } from '@/Shared/Domain/ValueObject'

interface UserNameProps {
  readonly value: string
}

export class UserName extends ValueObject<UserNameProps> {
  private constructor(props: UserNameProps) {
    super(props)
  }

  /**
   * 建立 UserName ValueObject
   *
   * 執行驗證和規範化：
   * - 移除前後空白
   * - 驗證不能只有空格
   * - 驗證長度（3-100 字元）
   * - 驗證不包含特殊字元（只允許字母、數字、空格、連字符）
   *
   * @param name 用戶名稱字串
   * @throws Error 如果格式無效
   */
  static create(name: string): UserName {
    const trimmed = name.trim()

    // 驗證不能只有空格
    if (trimmed.length === 0) {
      throw new Error('用戶名稱不能只包含空格')
    }

    // 驗證長度
    if (trimmed.length < 3) {
      throw new Error(`用戶名稱長度至少需要 3 個字元，目前：${trimmed.length}`)
    }

    if (trimmed.length > 100) {
      throw new Error(`用戶名稱長度不能超過 100 個字元，目前：${trimmed.length}`)
    }

    // 驗證字元（允許字母、數字、空格、連字符、點）
    const nameRegex = /^[a-zA-Z0-9\s\-\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]+$/
    if (!nameRegex.test(trimmed)) {
      throw new Error(
        `用戶名稱包含不允許的字元。只允許字母、數字、空格、連字符、點和中文、日文字符`
      )
    }

    return new UserName({ value: trimmed })
  }

  get value(): string {
    return this.props.value
  }

  toString(): string {
    return this.props.value
  }
}
