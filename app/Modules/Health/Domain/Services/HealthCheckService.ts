/**
 * @file HealthCheckService.ts
 * @description 系統健康檢查領域服務 (Domain Service)
 */

import { SystemChecks } from '../ValueObjects/SystemChecks'
import type { IInfrastructureProbe } from './IInfrastructureProbe'

/**
 * HealthCheckService 類別
 *
 * 在 DDD 架構中作為「領域服務 (Domain Service)」。
 * 協調各個基礎設施元件的探測，但不直接知道探測的實現細節。
 */
export class HealthCheckService {
  /**
   * @param probe - 基礎設施探測器介面
   */
  constructor(private readonly probe: IInfrastructureProbe) {}

  /**
   * 執行完整的系統健康檢查
   *
   * @returns Promise 包含 SystemChecks 結果物件
   */
  async performSystemCheck(): Promise<SystemChecks> {
    // 取得所有可探測的組件
    const components = this.probe.getProbeableComponents()

    // 同時發起所有組件的檢查請求
    const results = await Promise.all(
      components.map((component) => this.probe.probeByName(component))
    )

    // 彙整結果為 Map
    const checks = new Map(components.map((component, index) => [component, results[index]]))

    return SystemChecks.create(checks)
  }
}
