/**
 * 領域事件抽象基底類別
 *
 * @module DomainEvent
 * @description 所有領域事件的基礎，提供：
 * - 事件識別碼 (eventId - UUID)
 * - 聚合根識別 (aggregateId)
 * - 事件類型識別 (eventType)
 * - 發生時間戳 (occurredAt)
 * - 事件結構版本 (version - 用於事件遷移)
 * - 事件負載資料 (data)
 *
 * 子類必須實作 toJSON() 方法以支援序列化。
 *
 * **DDD 角色**
 * - 核心：Domain Event（領域事件）
 * - 職責：代表領域中發生的重要事實。
 *
 * 版本管理：
 * - version: 事件結構的版本號（用於向後相容性）
 * - getSchemaVersion(): 返回語意版本 (MAJOR.MINOR.PATCH)
 */
export abstract class DomainEvent {
	/** 事件唯一識別碼 */
	readonly eventId: string = crypto.randomUUID()
	/** 聚合根 ID */
	readonly aggregateId: string
	/** 聚合類型 */
	readonly aggregateType?: string
	/** 事件類型名稱 */
	readonly eventType: string
	/** 事件發生時間 */
	readonly occurredAt: Date
	/** 事件版本號（整數） */
	readonly version: number
	/** 事件資料內容 */
	readonly data: Record<string, unknown>
	/** 關聯 ID（用於 Saga 追蹤多個事件的因果關係） */
	readonly correlationId?: string
	/** 因果 ID（指向導致此事件的事件 ID） */
	readonly causationId?: string

	/**
	 * 建構子
	 *
	 * @param {string} aggregateId - 聚合根 ID
	 * @param {string} eventType - 事件類型
	 * @param {Record<string, unknown>} [data={}] - 事件負載資料
	 * @param {number} [version=1] - 事件版本
	 * @param {Date} [occurredAt] - 發生時間
	 * @param {string} [correlationId] - 關聯 ID（用於 Saga）
	 * @param {string} [causationId] - 因果 ID（指向源事件）
	 */
	constructor(
		aggregateId: string,
		eventType: string,
		data: Record<string, unknown> = {},
		version: number = 1,
		occurredAt?: Date,
		correlationId?: string,
		causationId?: string,
	) {
		this.aggregateId = aggregateId
		this.eventType = eventType
		this.occurredAt = occurredAt ?? new Date()
		this.version = version
		this.data = data
		this.correlationId = correlationId
		this.causationId = causationId
	}

	/**
	 * 獲取事件結構的語意版本 (MAJOR.MINOR.PATCH)
	 *
	 * 用於決定遷移策略：
	 * - 同一 MAJOR 版本：向後相容，使用遷移
	 * - 不同 MAJOR 版本：破壞性變更，可能需要特殊處理
	 *
	 * @returns {string} 語意版本字串
	 */
	getSchemaVersion(): string {
		const versions: Record<number, string> = {
			1: '1.0.0', // 初始版本
			2: '1.1.0', // 非破壞性新增
			3: '1.2.0',
			// 更多版本號映射...
		}
		return versions[this.version] ?? `1.${this.version - 1}.0`
	}

	/**
	 * 序列化事件為 JSON 物件
	 *
	 * @abstract
	 * @returns {Record<string, unknown>} JSON 物件
	 */
	abstract toJSON(): Record<string, unknown>
}
