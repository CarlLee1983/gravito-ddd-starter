/**
 * Redis 實作的事件儲存庫
 *
 * @module RedisEventStore
 * @description
 * 基於 Redis 的持久化 EventStore 實作。
 * - 事件按 aggregateId 和 eventType 雙索引儲存
 * - 支援事件重放和查詢
 * - 無 TTL，事件永久保存
 *
 * **Key 設計**
 * - `eventstore:agg:{aggregateId}` → Redis List，儲存該聚合根的所有事件
 * - `eventstore:type:{eventType}` → Redis List，儲存該類型的所有事件（副本）
 *
 * **DDD 角色**
 * - 基礎設施：EventStore 實作（Port 實現）
 * - 職責：持久化和查詢領域事件
 */

import type { IEventStore, StoredEvent } from '../../Ports/Database/IEventStore'
import type { IRedisService } from '../../Ports/Messaging/IRedisService'

export class RedisEventStore implements IEventStore {
	/**
	 * 建構子
	 * @param redis - Redis 服務實例
	 */
	constructor(private readonly redis: IRedisService) {}

	/**
	 * 生成聚合根鍵名
	 */
	private aggKey(aggregateId: string): string {
		return `eventstore:agg:${aggregateId}`
	}

	/**
	 * 生成事件型別鍵名
	 */
	private typeKey(eventType: string): string {
		return `eventstore:type:${eventType}`
	}

	/**
	 * 寫入事件到 Redis
	 * 同時寫入聚合根索引和事件型別索引
	 */
	async append(events: StoredEvent[]): Promise<void> {
		for (const event of events) {
			const json = JSON.stringify(event)
			// 寫入聚合根索引
			await this.redis.rpush(this.aggKey(event.aggregateId), json)
			// 寫入事件型別索引
			await this.redis.rpush(this.typeKey(event.eventType), json)
		}
	}

	/**
	 * 根據聚合根 ID 載入事件
	 * 支援過濾聚合根型別和版本
	 */
	async loadByAggregateId(
		aggregateId: string,
		aggregateType?: string,
		fromVersion?: number
	): Promise<StoredEvent[]> {
		const raw = await this.redis.lrange(this.aggKey(aggregateId), 0, -1)
		const events = raw.map((s) => JSON.parse(s) as StoredEvent)

		return events.filter((event) => {
			if (aggregateType && event.aggregateType !== aggregateType) {
				return false
			}
			if (fromVersion !== undefined && event.aggregateVersion < fromVersion) {
				return false
			}
			return true
		})
	}

	/**
	 * 根據事件型別載入事件
	 */
	async loadByEventType(eventType: string): Promise<StoredEvent[]> {
		const raw = await this.redis.lrange(this.typeKey(eventType), 0, -1)
		return raw.map((s) => JSON.parse(s) as StoredEvent)
	}

	/**
	 * 計算指定聚合根的事件數量
	 */
	async countByAggregateId(aggregateId: string): Promise<number> {
		return this.redis.llen(this.aggKey(aggregateId))
	}
}
