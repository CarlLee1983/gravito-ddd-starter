/**
 * SystemChecks Value Object
 *
 * 代表系統各個組件的檢查結果。
 * 作為值物件，具有不可變性和結構相等性。
 */

import { ValueObject } from '@/Shared/Domain/ValueObject'
import { HealthStatus } from './HealthStatus'

interface SystemChecksProps extends Record<string, unknown> {
  readonly database: boolean
  readonly redis: boolean
  readonly cache: boolean
}

export class SystemChecks extends ValueObject<SystemChecksProps> {
  private constructor(props: SystemChecksProps) {
    super(props)
  }

  /**
   * 建立 SystemChecks
   *
   * @param database 資料庫是否正常
   * @param redis Redis 是否正常（預設 true）
   * @param cache 快取是否正常（預設 true）
   */
  static create(database: boolean, redis = true, cache = true): SystemChecks {
    return new SystemChecks({ database, redis, cache })
  }

  /**
   * 根據檢查結果推導整體健康狀態
   *
   * @returns HealthStatus
   */
  deriveStatus(): HealthStatus {
    const allHealthy = this.props.database && this.props.redis && this.props.cache
    return allHealthy ? HealthStatus.healthy() : HealthStatus.degraded()
  }

  get database(): boolean {
    return this.props.database
  }

  get redis(): boolean {
    return this.props.redis
  }

  get cache(): boolean {
    return this.props.cache
  }

  toString(): string {
    return `SystemChecks(db=${this.database}, redis=${this.redis}, cache=${this.cache})`
  }
}
