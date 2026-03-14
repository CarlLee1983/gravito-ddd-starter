/**
 * @file OrderStatus.ts
 * @description 訂單狀態值物件 (Value Object)
 *
 * 在 DDD 架構中的角色：
 * - 領域層 (Domain Layer)：訂單生命週期的核心狀態表示。
 * - 職責：封裝訂單狀態枚舉與狀態檢查邏輯，確保狀態變更符合預定義的轉換規則。
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'

/**
 * 訂單狀態列舉值
 */
export enum OrderStatusEnum {
  /** 待處理 */
  PENDING = 'PENDING',
  /** 已確認 */
  CONFIRMED = 'CONFIRMED',
  /** 已發貨 */
  SHIPPED = 'SHIPPED',
  /** 已取消 */
  CANCELLED = 'CANCELLED',
}

/**
 * 訂單狀態值物件
 */
export class OrderStatus extends ValueObject<{ value: OrderStatusEnum }> {
  /**
   * 私有建構子
   *
   * @param value - 狀態列舉值
   * @private
   */
  private constructor(value: OrderStatusEnum) {
    super({ value })
  }

  /**
   * 建立初始狀態（預設為 PENDING）
   *
   * @returns 初始狀態為 PENDING 的 OrderStatus 實體
   */
  static create(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.PENDING)
  }

  /**
   * 從字串形式還原狀態物件
   *
   * @param value - 狀態字串
   * @returns 對應的 OrderStatus 實體
   * @throws Error 當字串不屬於合法的 OrderStatusEnum 時
   */
  static fromString(value: string): OrderStatus {
    if (!Object.values(OrderStatusEnum).includes(value as OrderStatusEnum)) {
      throw new Error(`非法訂單狀態: ${value}`)
    }
    return new OrderStatus(value as OrderStatusEnum)
  }

  /**
   * 獲取狀態列舉值
   */
  get value(): OrderStatusEnum {
    return this.props.value
  }

  /**
   * 判斷訂單是否處於待處理 (PENDING) 狀態
   */
  isPending(): boolean {
    return this.props.value === OrderStatusEnum.PENDING
  }

  /**
   * 判斷訂單是否處於已確認 (CONFIRMED) 狀態
   */
  isConfirmed(): boolean {
    return this.props.value === OrderStatusEnum.CONFIRMED
  }

  /**
   * 判斷訂單是否處於已發貨 (SHIPPED) 狀態
   */
  isShipped(): boolean {
    return this.props.value === OrderStatusEnum.SHIPPED
  }

  /**
   * 判斷訂單是否處於已取消 (CANCELLED) 狀態
   */
  isCancelled(): boolean {
    return this.props.value === OrderStatusEnum.CANCELLED
  }

  /**
   * 取得狀態的字串表示形式
   */
  toString(): string {
    return this.props.value
  }
}

