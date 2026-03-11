/**
 * IInfrastructureProbe Port 介面
 *
 * Domain Service 定義的 Port，由 Infrastructure 層的 Adapter 實現。
 * 這遵循 Hexagonal Architecture (六邊形架構) 的原則，
 * Domain 層定義需要的 Port，外層的 Adapter 提供實現。
 */

export interface IInfrastructureProbe {
  /**
   * 探測資料庫連線可用性
   *
   * @returns 資料庫是否可用
   */
  probeDatabase(): Promise<boolean>

  /**
   * 探測 Redis 服務可用性
   *
   * @returns Redis 是否可用
   */
  probeRedis(): Promise<boolean>

  /**
   * 探測快取服務可用性
   *
   * @returns 快取是否可用
   */
  probeCache(): Promise<boolean>
}
