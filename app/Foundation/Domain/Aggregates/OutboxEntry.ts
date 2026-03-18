/**
 * @file OutboxEntry.ts
 * @description Outbox 模式的聚合根
 *
 * 確保「DB 操作 + 事件分派」的原子性：
 * - 若 DB 寫入成功但事件分派失敗，OutboxEntry 仍保存在 DB
 * - OutboxWorker 定期掃描並重試失敗的事件分派
 *
 * 設計原則：
 * - 不可變（Immutable）：所有狀態改變返回新實例
 * - 樂觀鎖版本號：防止並發衝突
 * - 防重機制：eventId 應唯一（由應用層保證）
 */

import type { IntegrationEvent } from '../IntegrationEvent'

/**
 * Outbox 項目狀態
 */
export type OutboxStatus = 'pending' | 'processed' | 'failed'

/**
 * Outbox 聚合根
 *
 * 代表待分派的整合事件。一旦分派成功，會被標記為 processed。
 * 若分派失敗，重試機制會在 retryCount 超過上限後轉移至 Dead Letter Queue。
 */
export class OutboxEntry {
	private readonly _id: string
	private readonly _eventId: string
	private readonly _aggregateId: string
	private readonly _aggregateType: string
	private readonly _eventType: string
	private readonly _payload: IntegrationEvent
	private readonly _createdAt: Date
	private readonly _processedAt: Date | null
	private readonly _status: OutboxStatus
	private readonly _retryCount: number
	private readonly _lastError: string | null
	private readonly _version: number

	constructor(
		id: string,
		eventId: string,
		aggregateId: string,
		aggregateType: string,
		eventType: string,
		payload: IntegrationEvent,
		createdAt: Date,
		processedAt: Date | null = null,
		status: OutboxStatus = 'pending',
		retryCount: number = 0,
		lastError: string | null = null,
		version: number = 0
	) {
		this._id = id
		this._eventId = eventId
		this._aggregateId = aggregateId
		this._aggregateType = aggregateType
		this._eventType = eventType
		this._payload = payload
		this._createdAt = createdAt
		this._processedAt = processedAt
		this._status = status
		this._retryCount = retryCount
		this._lastError = lastError
		this._version = version
	}

	// ============================================
	// 工廠方法（建立新的 Outbox 項目）
	// ============================================

	/**
	 * 建立新的待處理 Outbox 項目
	 *
	 * @param id - Outbox 項目 ID（UUID）
	 * @param eventId - 事件 ID
	 * @param aggregateId - 聚合根 ID
	 * @param aggregateType - 聚合根類型
	 * @param eventType - 事件類型
	 * @param payload - 整合事件 payload
	 * @returns 新的 OutboxEntry 實例（狀態為 pending）
	 */
	static createNew(
		id: string,
		eventId: string,
		aggregateId: string,
		aggregateType: string,
		eventType: string,
		payload: IntegrationEvent
	): OutboxEntry {
		return new OutboxEntry(
			id,
			eventId,
			aggregateId,
			aggregateType,
			eventType,
			payload,
			new Date(),
			null,
			'pending',
			0,
			null,
			0
		)
	}

	// ============================================
	// Getter 方法
	// ============================================

	get id(): string {
		return this._id
	}

	get eventId(): string {
		return this._eventId
	}

	get aggregateId(): string {
		return this._aggregateId
	}

	get aggregateType(): string {
		return this._aggregateType
	}

	get eventType(): string {
		return this._eventType
	}

	get payload(): IntegrationEvent {
		return this._payload
	}

	get createdAt(): Date {
		return this._createdAt
	}

	get processedAt(): Date | null {
		return this._processedAt
	}

	get status(): OutboxStatus {
		return this._status
	}

	get retryCount(): number {
		return this._retryCount
	}

	get lastError(): string | null {
		return this._lastError
	}

	get version(): number {
		return this._version
	}

	// ============================================
	// 狀態轉移方法（返回新實例，保持不可變）
	// ============================================

	/**
	 * 標記為已處理
	 *
	 * @returns 新的 OutboxEntry 實例（狀態為 processed）
	 */
	markAsProcessed(): OutboxEntry {
		if (this._status === 'processed') {
			return this
		}

		return new OutboxEntry(
			this._id,
			this._eventId,
			this._aggregateId,
			this._aggregateType,
			this._eventType,
			this._payload,
			this._createdAt,
			new Date(), // processedAt = now
			'processed',
			this._retryCount,
			null, // 清除錯誤信息
			this._version + 1
		)
	}

	/**
	 * 標記為失敗並記錄錯誤
	 *
	 * @param error - 錯誤信息
	 * @returns 新的 OutboxEntry 實例（狀態為 failed，retryCount 遞增）
	 */
	markAsFailed(error: string): OutboxEntry {
		if (this._status === 'processed') {
			// 已處理的項目不應再失敗
			return this
		}

		return new OutboxEntry(
			this._id,
			this._eventId,
			this._aggregateId,
			this._aggregateType,
			this._eventType,
			this._payload,
			this._createdAt,
			this._processedAt,
			'failed',
			this._retryCount + 1,
			error,
			this._version + 1
		)
	}

	/**
	 * 重置為待處理（用於重試機制）
	 *
	 * @returns 新的 OutboxEntry 實例（狀態回到 pending，不改變 retryCount）
	 */
	resetForRetry(): OutboxEntry {
		if (this._status === 'processed') {
			return this
		}

		return new OutboxEntry(
			this._id,
			this._eventId,
			this._aggregateId,
			this._aggregateType,
			this._eventType,
			this._payload,
			this._createdAt,
			this._processedAt,
			'pending',
			this._retryCount,
			null, // 清除錯誤信息，準備重試
			this._version + 1
		)
	}

	// ============================================
	// 查詢方法
	// ============================================

	/**
	 * 是否待處理
	 */
	isPending(): boolean {
		return this._status === 'pending'
	}

	/**
	 * 是否已處理
	 */
	isProcessed(): boolean {
		return this._status === 'processed'
	}

	/**
	 * 是否失敗
	 */
	isFailed(): boolean {
		return this._status === 'failed'
	}

	/**
	 * 是否應該放入 Dead Letter Queue（超過最大重試次數）
	 *
	 * @param maxRetries - 最大重試次數（預設 3）
	 * @returns true 表示應移至 DLQ
	 */
	shouldMoveToDeadLetterQueue(maxRetries: number = 3): boolean {
		return this._retryCount > maxRetries && this._status === 'failed'
	}

	/**
	 * 轉換為 JSON（用於序列化與 API 回應）
	 */
	toJSON(): Record<string, unknown> {
		return {
			id: this._id,
			eventId: this._eventId,
			aggregateId: this._aggregateId,
			aggregateType: this._aggregateType,
			eventType: this._eventType,
			payload: this._payload,
			createdAt: this._createdAt.toISOString(),
			processedAt: this._processedAt?.toISOString() ?? null,
			status: this._status,
			retryCount: this._retryCount,
			lastError: this._lastError,
			version: this._version,
		}
	}
}
