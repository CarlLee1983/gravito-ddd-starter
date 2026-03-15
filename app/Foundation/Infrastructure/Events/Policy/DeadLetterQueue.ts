/**
 * @file DeadLetterQueue.ts
 * @description 死信隊列實現 - 記錄失敗事件以供後續重試或審計
 *
 * 當事件處理失敗超過最大重試次數後，記錄到死信隊列，方便後續排查和恢復
 */

import type { DeadLetterEntry } from './EventFailurePolicy'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'

/**
 * 死信隊列介面
 */
export interface IDeadLetterQueue {
	/**
	 * 添加失敗事件到死信隊列
	 * @param entry - 死信條目
	 */
	add(entry: Omit<DeadLetterEntry, 'id'>): Promise<void>

	/**
	 * 查詢死信隊列中的條目
	 * @param eventName - 事件名稱（可選，用於篩選）
	 * @returns 死信條目列表
	 */
	list(eventName?: string): Promise<DeadLetterEntry[]>

	/**
	 * 獲取特定條目
	 * @param id - 條目 ID
	 */
	get(id: string): Promise<DeadLetterEntry | null>

	/**
	 * 清空死信隊列
	 */
	clear(): Promise<void>

	/**
	 * 獲取統計信息
	 */
	stats(): Promise<{ total: number; byEventName: Record<string, number> }>
}

/**
 * 內存死信隊列實現（用於測試和開發環境）
 */
export class MemoryDeadLetterQueue implements IDeadLetterQueue {
	private entries: Map<string, DeadLetterEntry> = new Map()
	private logger: ILogger

	constructor(logger?: ILogger) {
		this.logger = logger ?? {
			info: (msg: string) => console.info(`[MemoryDeadLetterQueue] ${msg}`),
			warn: (msg: string) => console.warn(`[MemoryDeadLetterQueue] ${msg}`),
			error: (msg: string, err?: any) => console.error(`[MemoryDeadLetterQueue] ${msg}`, err),
			debug: (msg: string) => console.debug(`[MemoryDeadLetterQueue] ${msg}`),
		}
	}

	async add(entry: Omit<DeadLetterEntry, 'id'>): Promise<void> {
		const id = `dlq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
		this.entries.set(id, { ...entry, id } as DeadLetterEntry)

		this.logger.warn(`添加失敗事件: ${entry.eventName} (ID: ${id})`)
		this.logger.warn(`原因: ${entry.error}`)
	}

	async list(eventName?: string): Promise<DeadLetterEntry[]> {
		const entries = Array.from(this.entries.values())
		if (eventName) {
			return entries.filter((e) => e.eventName === eventName)
		}
		return entries
	}

	async get(id: string): Promise<DeadLetterEntry | null> {
		return this.entries.get(id) || null
	}

	async clear(): Promise<void> {
		this.entries.clear()
	}

	async stats(): Promise<{ total: number; byEventName: Record<string, number> }> {
		const byEventName: Record<string, number> = {}
		for (const entry of this.entries.values()) {
			byEventName[entry.eventName] = (byEventName[entry.eventName] || 0) + 1
		}
		return {
			total: this.entries.size,
			byEventName,
		}
	}
}

/**
 * Redis 死信隊列實現（用於生產環境）
 * 存儲在 Redis 的有序集合中，便於查詢和管理
 *
 * NOTE: 此實現使用 RedisClientContract 的完整功能集，包括 hash、sorted set 操作。
 * 為支持多種 Redis 實現，這裡使用 `any` 型別。未來可抽象為更完整的 IRedisService。
 */
export class RedisDeadLetterQueue implements IDeadLetterQueue {
	private readonly queueKey = 'dead_letter_queue'
	private readonly indexKey = 'dead_letter_index' // 用於統計
	private logger: ILogger

	constructor(private readonly redis: any, logger?: ILogger) {
		this.logger = logger ?? {
			info: (msg: string) => console.info(`[RedisDeadLetterQueue] ${msg}`),
			warn: (msg: string) => console.warn(`[RedisDeadLetterQueue] ${msg}`),
			error: (msg: string, err?: any) => console.error(`[RedisDeadLetterQueue] ${msg}`, err),
			debug: (msg: string) => console.debug(`[RedisDeadLetterQueue] ${msg}`),
		}
	}

	async add(entry: Omit<DeadLetterEntry, 'id'>): Promise<void> {
		const id = `dlq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
		const dlqEntry: DeadLetterEntry = { ...entry, id } as DeadLetterEntry

		// 存儲到 Redis Hash
		const key = `${this.queueKey}:${id}`
		await this.redis.hset(key, 'data', JSON.stringify(dlqEntry))

		// 存儲索引（用於快速查詢和統計）
		await this.redis.zadd(this.indexKey, Date.now(), id)
		await this.redis.zadd(`${this.indexKey}:${entry.eventName}`, Date.now(), id)

		// 設置 TTL (7 天後自動刪除)
		await this.redis.expire(key, 7 * 24 * 60 * 60)

		this.logger.warn(`添加失敗事件: ${entry.eventName} (ID: ${id})`)
	}

	async list(eventName?: string): Promise<DeadLetterEntry[]> {
		const indexKey = eventName ? `${this.indexKey}:${eventName}` : this.indexKey
		const ids = await this.redis.zrange(indexKey, 0, -1)

		const entries: DeadLetterEntry[] = []
		for (const id of ids) {
			const entry = await this.get(id)
			if (entry) {
				entries.push(entry)
			}
		}
		return entries
	}

	async get(id: string): Promise<DeadLetterEntry | null> {
		const key = `${this.queueKey}:${id}`
		const data = await this.redis.hgetall(key)
		if (!data || Object.keys(data).length === 0) {
			return null
		}
		return JSON.parse(Object.values(data)[0] as string)
	}

	async clear(): Promise<void> {
		// 刪除所有死信隊列鍵
		const keys = await this.redis.keys(`${this.queueKey}:*`)
		if (keys.length > 0) {
			await this.redis.del(...keys)
		}
		await this.redis.del(this.indexKey)
	}

	async stats(): Promise<{ total: number; byEventName: Record<string, number> }> {
		const total = await this.redis.zcard(this.indexKey)
		const eventNames = await this.redis.keys(`${this.indexKey}:*`)

		const byEventName: Record<string, number> = {}
		for (const key of eventNames) {
			const eventName = key.replace(`${this.indexKey}:`, '')
			const count = await this.redis.zcard(key)
			byEventName[eventName] = count
		}

		return { total, byEventName }
	}
}
