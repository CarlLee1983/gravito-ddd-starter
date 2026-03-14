/**
 * 整合事件 -- 跨 Bounded Context 的事件契約
 *
 * @module IntegrationEvent
 * @description
 * 與 DomainEvent 的區別：
 * - **DomainEvent**: 同一 Bounded Context 內的事件，可包含完整領域型別
 * - **IntegrationEvent**: 跨 Context 的事件，只包含原始型別（string, number, boolean, null）
 *
 * **設計原則**
 * - 只使用 JSON 可序列化的型別（無 Date, UUID class 等）
 * - 事件資料應該是「最小化的事實」，不包含接收 Context 不需要的細節
 * - 版本管理用於非破壞性變更和向後相容
 *
 * **與 Domain Event 的映射**
 * Context 邊界處應有 ACL (Anti-Corruption Layer)：
 * ```
 * DomainEvent (內部)
 *   ↓ (ACL 轉換)
 * IntegrationEvent (跨 Context)
 *   ↓ (ACL 反轉)
 * 另一個 Context 的 Domain Event 或 Handler
 * ```
 *
 * **範例**
 * ```typescript
 * const userCreatedEvent: IntegrationEvent = {
 *   eventId: '550e8400-e29b-41d4-a716-446655440000',
 *   eventType: 'UserCreated',
 *   occurredAt: '2026-03-11T10:30:00Z',
 *   sourceContext: 'Identity',
 *   data: {
 *     userId: 'usr-123',
 *     email: 'user@example.com',
 *     createdAt: '2026-03-11T10:30:00Z'
 *   }
 * }
 * ```
 */

/**
 * 整合事件介面
 *
 * 跨 Bounded Context 通訊的標準化事件格式
 */
export interface IntegrationEvent {
  /**
   * 事件唯一識別碼（UUID）
   * 用於去重和追蹤
   */
  readonly eventId: string

  /**
   * 事件類型名稱（如 'UserCreated', 'OrderPlaced'）
   * 接收 Context 用此欄位決定是否處理
   */
  readonly eventType: string

  /**
   * 事件發生時間（ISO 8601 字串）
   * @example "2026-03-11T10:30:00Z"
   */
  readonly occurredAt: string

  /**
   * 來源 Bounded Context 名稱
   * 用於識別事件的發出方，協助 ACL 路由
   * @example "Identity", "Order", "Payment"
   */
  readonly sourceContext: string

  /**
   * 事件負載資料
   * 僅包含原始型別：string, number, boolean, null
   * 不包含 Date, UUID class 等複雜物件
   */
  readonly data: Record<string, string | number | boolean | null>

  /**
   * 事件結構版本號（選用）
   * 用於向後相容的版本管理
   * @example 1
   * @default 1
   */
  readonly version?: number

  /**
   * 聚合根 ID（選用）
   * 若事件與特定 Aggregate 相關
   * @example "usr-123"
   */
  readonly aggregateId?: string

  /**
   * 聚合根型別（選用）
   * @example "User", "Order"
   */
  readonly aggregateType?: string
}

/**
 * 構建 IntegrationEvent 的工廠方法
 *
 * @param eventType - 事件型別
 * @param sourceContext - 來源 Context
 * @param data - 事件資料（只允許原始型別）
 * @param aggregateId - 可選的 Aggregate ID
 * @returns 構建好的 IntegrationEvent
 *
 * @example
 * ```typescript
 * const event = createIntegrationEvent(
 *   'UserCreated',
 *   'Identity',
 *   {
 *     userId: 'usr-123',
 *     email: 'user@example.com'
 *   },
 *   'usr-123'
 * )
 * ```
 */
export function createIntegrationEvent(
  eventType: string,
  sourceContext: string,
  data: Record<string, string | number | boolean | null>,
  aggregateId?: string,
  version: number = 1
): IntegrationEvent {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    occurredAt: new Date().toISOString(),
    sourceContext,
    data,
    version,
    aggregateId,
  }
}

/**
 * 從 DomainEvent 轉換為 IntegrationEvent
 * 這通常在 Anti-Corruption Layer (ACL) 中執行
 *
 * @param eventType - 整合事件型別
 * @param sourceContext - 來源 Context
 * @param data - 事件資料（必須只包含原始型別）
 * @param aggregateId - Aggregate ID
 * @returns IntegrationEvent
 *
 * @example
 * ```typescript
 * // 在 User Context 的 Infrastructure 層
 * const domainEvent = new UserCreated(...)
 * const integrationEvent = toIntegrationEvent(
 *   'UserCreated',
 *   'Identity',
 *   {
 *     userId: domainEvent.userId,
 *     email: domainEvent.email.value
 *   },
 *   domainEvent.id
 * )
 * ```
 */
export function toIntegrationEvent(
  eventType: string,
  sourceContext: string,
  data: Record<string, string | number | boolean | null>,
  aggregateId?: string
): IntegrationEvent {
  return createIntegrationEvent(eventType, sourceContext, data, aggregateId)
}
