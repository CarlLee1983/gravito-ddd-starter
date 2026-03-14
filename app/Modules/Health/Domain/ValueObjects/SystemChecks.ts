/**
 * SystemChecks Value Object
 *
 * 代表系統各個組件的檢查結果。
 * 作為值物件，具有不可變性和結構相等性。
 *
 * 改進：使用 Map 結構而非硬編碼屬性，完全與基礎設施選擇無關。
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'
import { HealthStatus } from './HealthStatus'

interface SystemChecksProps extends Record<string, unknown> {
  readonly checks: ReadonlyMap<string, boolean>
}

export class SystemChecks extends ValueObject<SystemChecksProps> {
  private constructor(props: SystemChecksProps) {
    super(props)
  }

  /**
   * 建立 SystemChecks
   *
   * @param checks 組件名稱 → 健康狀態 的 Map
   */
  static create(checks: Map<string, boolean> | Record<string, boolean>): SystemChecks {
    const checksMap = checks instanceof Map ? checks : new Map(Object.entries(checks))
    return new SystemChecks({ checks: checksMap })
  }

  /**
   * 根據檢查結果推導整體健康狀態
   *
   * @returns HealthStatus
   */
  deriveStatus(): HealthStatus {
    const allHealthy = Array.from(this.props.checks.values()).every((status) => status)
    return allHealthy ? HealthStatus.healthy() : HealthStatus.degraded()
  }

  /**
   * 取得特定組件的檢查結果
   *
   * @param name 組件名稱
   * @returns 該組件的健康狀態，若不存在則返回 null
   */
  getCheckResult(name: string): boolean | null {
    return this.props.checks.get(name) ?? null
  }

  /**
   * 取得所有檢查結果
   *
   * @returns 檢查結果的 Map（只讀）
   */
  get checks(): ReadonlyMap<string, boolean> {
    return this.props.checks
  }

  toString(): string {
    const entries = Array.from(this.props.checks.entries())
      .map(([name, status]) => `${name}=${status}`)
      .join(', ')
    return `SystemChecks(${entries})`
  }
}
