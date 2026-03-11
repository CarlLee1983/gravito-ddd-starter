/**
 * @file HealthCheckService.ts
 * @description 系統健康檢查領域服務 (Domain Service)
 * @module app/Modules/Health/Domain/Services
 *
 * Domain Service 不包含基礎設施實現，只定義業務邏輯。
 * 具體的探測實現由 Infrastructure 層的 Adapter 提供。
 */

import { SystemChecks } from '../ValueObjects/SystemChecks'
import type { IInfrastructureProbe } from './IInfrastructureProbe'

/**
 * HealthCheckService 類別
 *
 * 在 DDD 架構中作為「領域服務 (Domain Service)」。
 * 協調各個基礎設施元件的探測，但不直接知道探測的實現細節。
 *
 * 依賴注入：IInfrastructureProbe (Port)
 */
export class HealthCheckService {
  constructor(private readonly probe: IInfrastructureProbe) {}

  /**
   * 執行完整的系統健康檢查
   *
   * 同時發起所有組件的檢查請求，並彙整結果。
   * Domain Service 只負責協調，具體實現由 Port 的 Adapter 提供。
   *
   * @returns Promise 包含 SystemChecks 結果物件
   */
  async performSystemCheck(): Promise<SystemChecks> {
    const [dbOk, redisOk, cacheOk] = await Promise.all([
      this.probe.probeDatabase(),
      this.probe.probeRedis(),
      this.probe.probeCache(),
    ])

    return SystemChecks.create(dbOk, redisOk, cacheOk)
  }
}
