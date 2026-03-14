/**
 * @file IInfrastructureProbe.ts
 * @description 基礎設施探測器介面 (Port)
 */

/**
 * IInfrastructureProbe Port 介面
 *
 * Domain Service 定義的 Port，由 Infrastructure 層的 Adapter 實現。
 */
export interface IInfrastructureProbe {
  /**
   * 按名稱探測一個基礎設施組件的可用性
   *
   * @param name - 組件名稱（如 'database'、'redis'、'cache'）
   * @returns 該組件是否可用
   */
  probeByName(name: string): Promise<boolean>

  /**
   * 取得所有可探測的組件名稱列表
   *
   * @returns 組件名稱陣列
   */
  getProbeableComponents(): string[]
}
