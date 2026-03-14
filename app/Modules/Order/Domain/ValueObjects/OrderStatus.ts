import { ValueObject } from '@/Foundation/Domain/ValueObject'

/**
 * OrderStatus 值物件 - 訂單狀態機
 */
export enum OrderStatusEnum {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  CANCELLED = 'CANCELLED',
}

export class OrderStatus extends ValueObject<{ value: OrderStatusEnum }> {
  private constructor(value: OrderStatusEnum) {
    super({ value })
  }

  /**
   * 創建初始狀態（PENDING）
   */
  static create(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.PENDING)
  }

  /**
   * 從字符串重建
   */
  static fromString(value: string): OrderStatus {
    if (!Object.values(OrderStatusEnum).includes(value as OrderStatusEnum)) {
      throw new Error(`非法訂單狀態: ${value}`)
    }
    return new OrderStatus(value as OrderStatusEnum)
  }

  /**
   * 獲取狀態值
   */
  get value(): OrderStatusEnum {
    return this.props.value
  }

  /**
   * 判斷是否為 PENDING
   */
  isPending(): boolean {
    return this.props.value === OrderStatusEnum.PENDING
  }

  /**
   * 判斷是否為 CONFIRMED
   */
  isConfirmed(): boolean {
    return this.props.value === OrderStatusEnum.CONFIRMED
  }

  /**
   * 判斷是否為 SHIPPED
   */
  isShipped(): boolean {
    return this.props.value === OrderStatusEnum.SHIPPED
  }

  /**
   * 判斷是否為 CANCELLED
   */
  isCancelled(): boolean {
    return this.props.value === OrderStatusEnum.CANCELLED
  }

  /**
   * 轉換為字符串
   */
  toString(): string {
    return this.props.value
  }
}
