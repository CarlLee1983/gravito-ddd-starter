import { ValueObject } from '@/Shared/Domain/ValueObject'

/**
 * OrderId 值物件 - 訂單 ID
 */
export class OrderId extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value })
  }

  /**
   * 生成新的 OrderId
   */
  static create(value: string = crypto.randomUUID()): OrderId {
    if (!value || value.trim().length === 0) {
      throw new Error('OrderId 不能為空')
    }
    return new OrderId(value)
  }

  /**
   * 從字符串重建 OrderId
   */
  static fromString(value: string): OrderId {
    return new OrderId(value)
  }

  /**
   * 獲取 OrderId 值
   */
  get value(): string {
    return this.props.value
  }

  /**
   * 轉換為字符串
   */
  toString(): string {
    return this.props.value
  }
}
