/**
 * @file HealthCheck.ts
 * @description 定義系統健康檢查的聚合根 (Aggregate Root)
 * @module src/Modules/Health/Domain/Aggregates
 */

import { HealthStatus } from '../ValueObjects/HealthStatus'

/**
 * HealthCheckProps 介面
 * 
 * 定義健康檢查聚合根所需的屬性結構。
 */
export interface HealthCheckProps {
  /** 檢查記錄唯一識別符 */
  id: string
  /** 檢查時間 */
  timestamp: Date
  /** 整體健康狀態 (值物件) */
  status: HealthStatus
  /** 子系統檢查詳情 */
  checks: {
    /** 資料庫狀態 */
    database: boolean
    /** Redis 狀態 (選填) */
    redis?: boolean
    /** 快取狀態 (選填) */
    cache?: boolean
  }
  /** 狀態訊息 (選填) */
  message?: string
}

/**
 * HealthCheck 類別
 * 
 * 在 DDD 架構中作為「聚合根 (Aggregate Root)」。
 * 代表系統在特定時間點的健康狀況快照，封裝了狀態判斷邏輯。
 */
export class HealthCheck {
  /** 內部屬性 */
  private props: HealthCheckProps

  /**
   * 私有建構函數
   * 
   * @param props - 健康檢查屬性
   */
  private constructor(props: HealthCheckProps) {
    this.props = props
  }

  /**
   * 靜態工廠方法：建立新的健康檢查記錄
   * 
   * 根據子系統的檢查結果自動判定整體的 HealthStatus。
   * 
   * @param id - 唯一識別符
   * @param checks - 各子系統檢查結果
   * @returns 新的 HealthCheck 聚合根
   */
  static create(id: string, checks: HealthCheckProps['checks']): HealthCheck {
    // 確定整體狀態
    const allHealthy = Object.values(checks).every((v) => v !== false)
    const status = allHealthy ? HealthStatus.healthy() : HealthStatus.degraded()

    return new HealthCheck({
      id,
      timestamp: new Date(),
      status,
      checks,
      message: allHealthy ? 'All systems operational' : 'Some services degraded'
    })
  }

  /**
   * 從資料庫原始資料重建聚合根 (基礎設施邏輯使用)
   * 
   * @param row - 資料庫原始資料行
   * @returns 重建後的 HealthCheck 實例
   */
  static fromDatabase(row: any): HealthCheck {
    return new HealthCheck({
      id: row.id,
      timestamp: new Date(row.timestamp),
      status: new HealthStatus(row.status),
      checks: JSON.parse(row.checks),
      message: row.message
    })
  }

  /**
   * 更新健康檢查狀態
   * 
   * @param checks - 新的各子系統檢查結果
   * @param message - 選填的狀態說明訊息
   * @returns void
   */
  update(checks: HealthCheckProps['checks'], message?: string): void {
    const allHealthy = Object.values(checks).every((v) => v !== false)
    this.props.checks = checks
    this.props.status = allHealthy ? HealthStatus.healthy() : HealthStatus.degraded()
    this.props.message = message || (allHealthy ? 'All systems operational' : 'Some services degraded')
    this.props.timestamp = new Date()
  }

  /**
   * 將狀態標記為不健康 (Unhealthy)
   * 
   * @param message - 錯誤訊息描述
   * @returns void
   */
  markAsUnhealthy(message: string): void {
    this.props.status = HealthStatus.unhealthy()
    this.props.message = message
    this.props.timestamp = new Date()
  }

  // Getters
  /** 獲取 ID */
  get id(): string {
    return this.props.id
  }

  /** 獲取時間戳 */
  get timestamp(): Date {
    return this.props.timestamp
  }

  /** 獲取整體狀態值物件 */
  get status(): HealthStatus {
    return this.props.status
  }

  /** 獲取各子系統檢查詳情 */
  get checks(): HealthCheckProps['checks'] {
    return this.props.checks
  }

  /** 獲取狀態訊息 */
  get message(): string | undefined {
    return this.props.message
  }

  /**
   * 轉換為資料庫儲存格式
   * 
   * @returns 純 JavaScript 物件，適合寫入資料庫
   */
  toDatabaseRow(): any {
    return {
      id: this.props.id,
      timestamp: this.props.timestamp,
      status: this.props.status.value,
      checks: JSON.stringify(this.props.checks),
      message: this.props.message
    }
  }
}
