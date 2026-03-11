/**
 * @file HealthStatus.ts
 * @description 定義健康狀態值物件 (Value Object)
 * @module src/Modules/Health/Domain/ValueObjects
 */

/** 健康狀態型別列舉 */
export type HealthStatusType = 'healthy' | 'degraded' | 'unhealthy'

/**
 * HealthStatus 類別
 * 
 * 在 DDD 架構中作為「值物件 (Value Object)」。
 * 代表系統的健康狀態等級。具有不可變性 (Immutable)，並封裝了狀態判定邏輯。
 */
export class HealthStatus {
  /** 內部的狀態值 */
  readonly value: HealthStatusType

  /**
   * 建立 HealthStatus 實例
   * 
   * @param value - 狀態值 ('healthy', 'degraded', 'unhealthy')
   * @throws Error 當傳入無效的狀態值時
   */
  constructor(value: HealthStatusType) {
    if (!['healthy', 'degraded', 'unhealthy'].includes(value)) {
      throw new Error(`Invalid health status: ${value}`)
    }
    this.value = value
  }

  /**
   * 判斷系統是否仍然可用 (非 unhealthy 狀態)
   * 
   * @returns boolean
   */
  isAvailable(): boolean {
    return this.value !== 'unhealthy'
  }

  /**
   * 判斷系統是否完全健康
   * 
   * @returns boolean
   */
  isFullyHealthy(): boolean {
    return this.value === 'healthy'
  }

  /**
   * 判斷系統是否處於降級運行狀態 (有警告)
   * 
   * @returns boolean
   */
  isDegraded(): boolean {
    return this.value === 'degraded'
  }

  /**
   * 檢查與另一個值物件是否相等
   * 
   * @param other - 另一個對象
   * @returns boolean
   */
  equals(other: any): boolean {
    return other instanceof HealthStatus && other.value === this.value
  }

  /**
   * 轉換為字串表達式
   * 
   * @returns string
   */
  toString(): string {
    return this.value
  }

  /**
   * 靜態工廠方法：建立「健康」狀態
   * @returns HealthStatus
   */
  static healthy(): HealthStatus {
    return new HealthStatus('healthy')
  }

  /**
   * 靜態工廠方法：建立「降級」狀態
   * @returns HealthStatus
   */
  static degraded(): HealthStatus {
    return new HealthStatus('degraded')
  }

  /**
   * 靜態工廠方法：建立「不健康」狀態
   * @returns HealthStatus
   */
  static unhealthy(): HealthStatus {
    return new HealthStatus('unhealthy')
  }
}
