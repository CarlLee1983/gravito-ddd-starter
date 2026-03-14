/**
 * @file HealthCheckDTO.ts
 * @description 定義健康檢查模組的資料傳輸物件 (DTO)
 */

import { HealthCheck } from '../../Domain/Aggregates/HealthCheck'

/**
 * HealthCheckJSONData 介面
 * 
 * 定義健康檢查結果轉換為 JSON 格式後的結構，用於 API 響應。
 */
export interface HealthCheckJSONData {
  /** 檢查記錄唯一識別符 */
  id: string
  /** 整體健康狀態 */
  status: string
  /** 檢查時間戳 (ISO 字串) */
  timestamp: string
  /** 各項子系統檢查結果 */
  checks: {
    /** 資料庫連接狀態 */
    database: boolean
    /** Redis 連接狀態 (選填) */
    redis?: boolean
    /** 快取服務狀態 (選填) */
    cache?: boolean
  }
  /** 狀態描述訊息 (選填) */
  message?: string
}

/**
 * HealthCheckDTO 類別
 * 
 * 在 DDD 架構中作為「資料傳輸物件 (DTO)」。
 * 負責在應用層與表現層之間傳遞健康檢查資料，並提供與領域實體之間的轉換方法。
 */
export class HealthCheckDTO {
  /** 檢查記錄唯一識別符 */
  id: string = ''
  /** 整體健康狀態 */
  status: string = ''
  /** 檢查時間 */
  timestamp: Date = new Date()
  /** 各項子系統檢查結果 */
  checks: {
    database: boolean
    redis?: boolean
    cache?: boolean
  } = { database: false }
  /** 狀態描述訊息 */
  message?: string

  /**
   * 從領域實體 (HealthCheck) 轉換為 DTO
   *
   * @param entity - 健康檢查領域聚合根
   * @returns 新的 HealthCheckDTO 實例
   */
  static fromEntity(entity: HealthCheck): HealthCheckDTO {
    const dto = new HealthCheckDTO()
    dto.id = entity.id
    dto.status = entity.status.toString()
    dto.timestamp = entity.performedAt
    dto.checks = {
      database: entity.checks.database,
      redis: entity.checks.redis,
      cache: entity.checks.cache,
    }
    dto.message = entity.message
    return dto
  }

  /**
   * 將 DTO 轉換為純 JSON 物件格式 (用於 HTTP 響應)
   * 
   * @returns 符合 HealthCheckJSONData 介面的物件
   */
  toJSON(): HealthCheckJSONData {
    return {
      id: this.id,
      status: this.status,
      timestamp: this.timestamp.toISOString(),
      checks: this.checks,
      message: this.message
    }
  }
}
