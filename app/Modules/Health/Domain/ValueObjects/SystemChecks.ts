/**
 * @file SystemChecks.ts
 * @description 系統檢查結果值物件
 */

import { ValueObject } from '@/Foundation/Domain/ValueObject'
import { HealthStatus } from './HealthStatus'

/**
 * SystemChecks 屬性介面
 */
interface SystemChecksProps extends Record<string, unknown> {
  readonly checks: ReadonlyMap<string, boolean>
}

/**
 * SystemChecks 值物件
 *
 * 代表系統各個組件的檢查結果。
 */
export class SystemChecks extends ValueObject<SystemChecksProps> {
  /**
   * @param props - 值物件屬性
   */
  private constructor(props: SystemChecksProps) {
    super(props)
  }

  /**
   * 建立 SystemChecks 實例
   *
   * @param checks - 組件名稱 → 健康狀態 的 Map 或物件
   * @returns SystemChecks 實例
   */
  static create(checks: Map<string, boolean> | Record<string, boolean>): SystemChecks {
    const checksMap = checks instanceof Map ? checks : new Map(Object.entries(checks))
    return new SystemChecks({ checks: checksMap })
  }

  /**
   * 根據檢查結果推導整體健康狀態
   *
   * @returns 健康狀態值物件
   */
  deriveStatus(): HealthStatus {
    const allHealthy = Array.from(this.props.checks.values()).every((status) => status)
    return allHealthy ? HealthStatus.healthy() : HealthStatus.degraded()
  }

  /**
   * 取得特定組件的檢查結果
   *
   * @param name - 組件名稱
   * @returns 該組件的健康狀態，若不存在則返回 null
   */
  getCheckResult(name: string): boolean | null {
    return this.props.checks.get(name) ?? null
  }

  /** 獲取所有檢查結果（唯讀 Map） */
  get checks(): ReadonlyMap<string, boolean> {
    return this.props.checks
  }

  /**
   * 轉換為可讀字串
   *
   * @returns 描述字串
   */
  toString(): string {
    const entries = Array.from(this.props.checks.entries())
      .map(([name, status]) => `${name}=${status}`)
      .join(', ')
    return `SystemChecks(${entries})`
  }
}
