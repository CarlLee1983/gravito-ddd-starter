/**
 * @file PerformHealthCheckService.ts
 * @description 執行系統健康檢查的應用服務 (Application Service)
 * @module src/Modules/Health/Application/Services
 */

import { HealthCheckService } from '../../Domain/Services/HealthCheckService'
import { HealthCheck } from '../../Domain/Aggregates/HealthCheck'
import { HealthCheckDTO } from '../DTOs/HealthCheckDTO'
import type { IHealthCheckRepository } from '../../Domain/Repositories/IHealthCheckRepository'

/**
 * PerformHealthCheckService 類別
 * 
 * 在 DDD 架構中作為「應用服務 (Application Service)」。
 * 負責協調領域對象 (Domain Service, Aggregate) 與基礎設施 (Repository) 來完成「執行並記錄健康檢查」這一案例 (Use Case)。
 */
export class PerformHealthCheckService {
  /** 內部使用的領域服務實例 */
  private domainService: HealthCheckService

  /**
   * 建立 PerformHealthCheckService 實例
   * 
   * @param repository - 健康檢查結果倉儲介面
   */
  constructor(private repository: IHealthCheckRepository) {
    this.domainService = new HealthCheckService()
  }

  /**
   * 執行完整的系統健康檢查並保存結果
   * 
   * @param db - 資料庫連線對象
   * @param redis - Redis 連線對象 (選填)
   * @param cache - 快取服務對象 (選填)
   * @returns Promise 包含健康檢查結果 DTO
   */
  async execute(db: any, redis?: any, cache?: any): Promise<HealthCheckDTO> {
    // 1. 執行系統檢查 (Domain Service)
    const checks = await this.domainService.checkSystem(db, redis, cache)

    // 2. 創建聚合根 (Domain Layer)
    const healthCheck = HealthCheck.create(`health-${Date.now()}`, checks)

    // 3. 保存到倉庫 (Infrastructure)
    await this.repository.save(healthCheck)

    // 4. 轉換為 DTO (應用層)
    return HealthCheckDTO.fromEntity(healthCheck)
  }

  /**
   * 獲取最後一次健康檢查記錄
   * 
   * @returns Promise 包含最後一次檢查結果 DTO，若無記錄則為 null
   */
  async getLatest(): Promise<HealthCheckDTO | null> {
    const check = await this.repository.findLatest()
    return check ? HealthCheckDTO.fromEntity(check) : null
  }

  /**
   * 獲取健康檢查歷史記錄
   * 
   * @param limit - 限制返回的筆數 (預設為 10)
   * @returns Promise 包含健康檢查結果 DTO 陣列
   */
  async getHistory(limit: number = 10): Promise<HealthCheckDTO[]> {
    const checks = await this.repository.findAll({ limit })
    return checks.map((check) => HealthCheckDTO.fromEntity(check))
  }
}
