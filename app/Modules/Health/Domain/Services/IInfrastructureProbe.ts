/**
 * IInfrastructureProbe Port 介面
 *
 * Domain Service 定義的 Port，由 Infrastructure 層的 Adapter 實現。
 * 這遵循 Hexagonal Architecture (六邊形架構) 的原則，
 * Domain 層定義需要的 Port，外層的 Adapter 提供實現。
 *
 * 改進：使用通用命名 `probeByName()`，而非硬編碼技術特定的方法。
 * 這樣 Health Domain 層完全與基礎設施選擇無關。
 */

export interface IInfrastructureProbe {
  /**
   * 按名稱探測一個基礎設施組件的可用性
   *
   * @param name 組件名稱（如 'database'、'redis'、'cache'）
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
