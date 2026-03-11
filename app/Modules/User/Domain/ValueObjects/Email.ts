/**
 * Email Value Object
 *
 * 代表用戶的電子郵件地址。
 * 作為值物件，具有不可變性、驗證邏輯和結構相等性。
 */

import { ValueObject } from '@/Shared/Domain/ValueObject'

interface EmailProps {
  readonly value: string
}

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props)
  }

  /**
   * 建立 Email ValueObject
   *
   * 執行驗證和規範化：
   * - 移除前後空白
   * - 轉為小寫
   * - 驗證格式
   *
   * @param email 電子郵件字串
   * @throws Error 如果格式無效
   */
  static create(email: string): Email {
    const trimmed = email.trim().toLowerCase()

    // 簡單的電子郵件格式驗證
    if (!trimmed.includes('@') || trimmed.length < 5 || trimmed.length > 254) {
      throw new Error(`無效的電子郵件格式: ${email}`)
    }

    // 基本的 RFC 5322 驗證（簡化版）
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) {
      throw new Error(`無效的電子郵件格式: ${email}`)
    }

    return new Email({ value: trimmed })
  }

  get value(): string {
    return this.props.value
  }

  toString(): string {
    return this.props.value
  }
}
