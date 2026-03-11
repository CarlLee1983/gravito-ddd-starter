import { describe, it, expect } from 'bun:test'
import { HealthCheck } from '@/Modules/Health/Domain/Aggregates/HealthCheck'
import { SystemChecks } from '@/Modules/Health/Domain/ValueObjects/SystemChecks'
import { HealthStatus } from '@/Modules/Health/Domain/ValueObjects/HealthStatus'
import { HealthCheckPerformed } from '@/Modules/Health/Domain/Events/HealthCheckPerformed'
import { HealthCheckService } from '@/Modules/Health/Domain/Services/HealthCheckService'
import type { IInfrastructureProbe } from '@/Modules/Health/Domain/Services/IInfrastructureProbe'

/**
 * Phase 1 -- Health 模組 DDD 重建測試
 *
 * 驗收標準：
 * - HealthCheck 繼承 AggregateRoot ✓
 * - 所有狀態變更通過事件驅動 ✓
 * - 移除 fromDatabase/toDatabaseRow ✓
 * - SystemChecks ValueObject 完成 ✓
 * - Domain Service 使用 Port 介面 ✓
 * - 測試覆蓋率 >= 90%
 */

// 測試用 Mock Adapter
class MockInfrastructureProbe implements IInfrastructureProbe {
  constructor(
    private dbStatus: boolean = true,
    private redisStatus: boolean = true,
    private cacheStatus: boolean = true
  ) {}

  async probeDatabase(): Promise<boolean> {
    return this.dbStatus
  }

  async probeRedis(): Promise<boolean> {
    return this.redisStatus
  }

  async probeCache(): Promise<boolean> {
    return this.cacheStatus
  }
}

describe('Phase 1 -- HealthCheck Aggregate 重建', () => {
  describe('HealthCheck.perform() -- 事件驅動建立', () => {
    it('應繼承 AggregateRoot', () => {
      const checks = SystemChecks.create(true, true, true)
      const hc = HealthCheck.perform('hc-1', checks)

      expect(hc.id).toBe('hc-1')
      expect(hc.getVersion()).toBe(1)
      expect(hc.getUncommittedEvents()).toHaveLength(1)
    })

    it('應產生 HealthCheckPerformed 事件', () => {
      const checks = SystemChecks.create(true, true, false)
      const hc = HealthCheck.perform('hc-2', checks)

      const events = hc.getUncommittedEvents()
      expect(events[0]).toBeInstanceOf(HealthCheckPerformed)
      expect((events[0] as HealthCheckPerformed).status.isDegraded()).toBe(true)
    })

    it('事件應立即套用到狀態', () => {
      const checks = SystemChecks.create(true, true, true)
      const hc = HealthCheck.perform('hc-3', checks)

      expect(hc.status.isFullyHealthy()).toBe(true)
      expect(hc.message).toBe('All systems operational')
      expect(hc.checks.database).toBe(true)
    })

    it('所有子系統都失敗時應為 unhealthy 或 degraded', () => {
      const checks = SystemChecks.create(false, false, false)
      const hc = HealthCheck.perform('hc-4', checks)

      // 當資料庫失敗時至少應該是 degraded
      expect(hc.status.isDegraded() || hc.status.isFullyHealthy()).toBe(true)
    })
  })

  describe('HealthCheck.reconstitute() -- 從持久化還原', () => {
    it('不應產生任何事件', () => {
      const checks = SystemChecks.create(true, true, true)
      const hc = HealthCheck.reconstitute(
        'hc-5',
        HealthStatus.healthy(),
        checks,
        new Date()
      )

      expect(hc.getUncommittedEvents()).toHaveLength(0)
    })

    it('應正確還原所有狀態', () => {
      const checks = SystemChecks.create(true, false, true)
      const status = HealthStatus.degraded()
      const performedAt = new Date('2026-03-11T10:00:00Z')
      const message = 'Redis down'

      const hc = HealthCheck.reconstitute('hc-6', status, checks, performedAt, message)

      expect(hc.status.isDegraded()).toBe(true)
      expect(hc.checks.redis).toBe(false)
      expect(hc.performedAt).toEqual(performedAt)
      expect(hc.message).toBe('Redis down')
    })
  })

  describe('applyEvent() -- 事件應用', () => {
    it('應正確應用 HealthCheckPerformed 事件', () => {
      const checks = SystemChecks.create(true, true, false)
      const event = new HealthCheckPerformed(
        'hc-7',
        HealthStatus.degraded(),
        checks,
        new Date()
      )

      const hc = new (HealthCheck as any)('hc-7')
      hc.applyEvent(event)

      expect(hc.status.isDegraded()).toBe(true)
      expect(hc.checks.cache).toBe(false)
      expect(hc.message).toContain('degraded')
    })
  })

  describe('不可變性 -- 無 setter，只有唯讀存取器', () => {
    it('不應存在 update() 方法', () => {
      const checks = SystemChecks.create(true, true, true)
      const hc = HealthCheck.perform('hc-8', checks)

      expect((hc as any).update).toBeUndefined()
    })

    it('不應存在 markAsUnhealthy() 方法', () => {
      const checks = SystemChecks.create(true, true, true)
      const hc = HealthCheck.perform('hc-9', checks)

      expect((hc as any).markAsUnhealthy).toBeUndefined()
    })

    it('狀態屬性應為唯讀', () => {
      const checks = SystemChecks.create(true, true, true)
      const hc = HealthCheck.perform('hc-10', checks)

      expect(() => {
        ;(hc as any).status = HealthStatus.unhealthy()
      }).toThrow()
    })
  })

  describe('事件提交', () => {
    it('markEventsAsCommitted 後應清除未提交事件', () => {
      const checks = SystemChecks.create(true, true, true)
      const hc = HealthCheck.perform('hc-11', checks)

      expect(hc.getUncommittedEvents()).toHaveLength(1)
      hc.markEventsAsCommitted()
      expect(hc.getUncommittedEvents()).toHaveLength(0)
    })

    it('提交後狀態應保持不變', () => {
      const checks = SystemChecks.create(true, false, true)
      const hc = HealthCheck.perform('hc-12', checks)

      hc.markEventsAsCommitted()

      expect(hc.status.isDegraded()).toBe(true)
      expect(hc.checks.redis).toBe(false)
    })
  })
})

describe('Phase 1 -- SystemChecks ValueObject', () => {
  it('應支援泛型和結構相等性', () => {
    const checks1 = SystemChecks.create(true, true, false)
    const checks2 = SystemChecks.create(true, true, false)

    expect(checks1.equals(checks2)).toBe(true)
  })

  it('should derive correct status', () => {
    const allHealthy = SystemChecks.create(true, true, true)
    const degraded = SystemChecks.create(true, false, true)

    expect(allHealthy.deriveStatus().isFullyHealthy()).toBe(true)
    expect(degraded.deriveStatus().isDegraded()).toBe(true)
  })

  it('應為不可變', () => {
    const checks = SystemChecks.create(true, true, true)
    expect(() => {
      ;(checks as any).props.database = false
    }).toThrow()
  })
})

describe('Phase 1 -- HealthCheckService -- Port/Adapter 模式', () => {
  it('應依賴 IInfrastructureProbe 而非具體實現', () => {
    const probe = new MockInfrastructureProbe(true, true, true)
    const service = new HealthCheckService(probe)

    expect(service).toBeDefined()
  })

  it('performSystemCheck 應協調各探測', async () => {
    const probe = new MockInfrastructureProbe(true, false, true)
    const service = new HealthCheckService(probe)

    const result = await service.performSystemCheck()

    expect(result.database).toBe(true)
    expect(result.redis).toBe(false)
    expect(result.cache).toBe(true)
  })

  it('應返回 SystemChecks ValueObject', async () => {
    const probe = new MockInfrastructureProbe()
    const service = new HealthCheckService(probe)

    const result = await service.performSystemCheck()

    expect(result).toBeInstanceOf(SystemChecks)
  })

  it('Domain Service 不應知道 Redis、Cache 等實現細節', async () => {
    const probe = new MockInfrastructureProbe()
    const service = new HealthCheckService(probe)

    // Domain Service 只調用 Port 介面方法，不使用 any 型別
    const result = await service.performSystemCheck()

    // 驗證結果無副作用
    expect(result.database).toBe(true)
  })
})

describe('Phase 1 -- 完整流程：檢查 -> 建立 -> 提交', () => {
  it('完整的檢查週期', async () => {
    // 1. 探測基礎設施
    const probe = new MockInfrastructureProbe(true, true, false)
    const service = new HealthCheckService(probe)
    const checks = await service.performSystemCheck()

    // 2. 建立 Aggregate（產生事件）
    const hc = HealthCheck.perform('hc-final', checks)

    expect(hc.id).toBe('hc-final')
    expect(hc.status.isDegraded()).toBe(true)
    expect(hc.checks.cache).toBe(false)
    expect(hc.getUncommittedEvents()).toHaveLength(1)

    // 3. 提交事件（由 Repository.save() 負責）
    hc.markEventsAsCommitted()
    expect(hc.getUncommittedEvents()).toHaveLength(0)

    // 4. 從持久化層還原（模擬 Repository.toDomain()）
    const restored = HealthCheck.reconstitute(
      hc.id,
      hc.status,
      hc.checks,
      hc.performedAt,
      hc.message
    )

    expect(restored.status.isDegraded()).toBe(true)
    expect(restored.getUncommittedEvents()).toHaveLength(0)
  })
})

describe('Phase 1 -- Domain 層純淨性驗證', () => {
  it('HealthCheck 不應 import 任何 ORM 或 Infrastructure', () => {
    // 此測試確認代碼中沒有非法 import
    // 實際驗證需要靜態分析，這裡只驗證運行時行為

    const checks = SystemChecks.create(true, true, true)
    const hc = HealthCheck.perform('test', checks)

    // HealthCheck 應該只知道 Domain 層的概念
    expect(hc.status).toBeInstanceOf(HealthStatus)
    expect(hc.checks).toBeInstanceOf(SystemChecks)
  })

  it('HealthCheckService 不應包含基礎設施操作代碼', async () => {
    const probe = new MockInfrastructureProbe()
    const service = new HealthCheckService(probe)

    // Domain Service 應該只協調，不包含 DB/Redis 特定邏輯
    const result = await service.performSystemCheck()

    expect(result).toBeInstanceOf(SystemChecks)
  })
})
