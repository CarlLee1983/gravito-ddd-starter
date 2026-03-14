/**
 * @file types/application/domain.d.ts
 * @description DDD 相關的共享類型定義
 *
 * 包含：
 * - 實體和聚合根標記型別
 * - 事件相關類型
 * - Result 型別 (Success/Error)
 */

// ============================================================================
// Entity & Aggregate Root Types
// ============================================================================

/**
 * 品牌型別，用於標記實體 ID
 * 防止不同實體 ID 的混淆
 */
type EntityId = string & { readonly __brand: 'EntityId' }

/**
 * 聚合根 ID 品牌型別
 */
type AggregateRootId = string & { readonly __brand: 'AggregateRootId' }

/**
 * 值物件標記型別
 */
type ValueObjectId = string & { readonly __brand: 'ValueObjectId' }

// ============================================================================
// Event Types
// ============================================================================

interface DomainEventMetadata {
  timestamp: Date
  version: number
  source: string
  correlationId?: string
  causationId?: string
}

interface IntegrationEventMetadata extends DomainEventMetadata {
  sourceContext: string  // 事件來源的 Bounded Context
  targetContexts?: string[]  // 可選的目標 Bounded Context
}

// ============================================================================
// Result Types (Success/Error Pattern)
// ============================================================================

type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }

type AsyncResult<T, E = Error> = Promise<Result<T, E>>

// ============================================================================
// Optional Types
// ============================================================================

type Optional<T> = T | null | undefined

export {}
