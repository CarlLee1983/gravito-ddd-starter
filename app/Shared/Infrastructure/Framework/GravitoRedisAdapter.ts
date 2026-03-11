/**
 * @file GravitoRedisAdapter.ts
 * @description Gravito Redis 服務適配器
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：實作 IRedisService 介面。
 * - 職責：將 Gravito 框架中的 Plasma Redis 用戶端適配為系統定義的 Redis 通訊協定，實現技術細節的隔離。
 */

import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'
import type { RedisClientContract } from '@gravito/plasma'

/**
 * 適配器類別：將 Gravito Plasma RedisClientContract 適配為全域通用的 IRedisService
 */
export class GravitoRedisAdapter implements IRedisService {
	/**
	 * 建構子
	 * @param redis - 原始的 Gravito Redis 用戶端實例
	 */
	constructor(private readonly redis: RedisClientContract) {}

	/**
	 * 測試 Redis 連線
	 * @returns 狀態回傳值 (通常為 "PONG")
	 */
	async ping(): Promise<string> {
		return (this.redis as any).ping()
	}

	/**
	 * 取得指定鍵值的字串內容
	 * @param key - 鍵名
	 * @returns 字串內容或 null
	 */
	async get(key: string): Promise<string | null> {
		return this.redis.get(key)
	}

	/**
	 * 設定字串鍵值
	 * @param key - 鍵名
	 * @param value - 字串內容
	 * @param expiresInSeconds - 過期時間 (秒)
	 */
	async set(
		key: string,
		value: string,
		expiresInSeconds?: number,
	): Promise<void> {
		if (expiresInSeconds) {
			await (this.redis as any).set(key, value, { ex: expiresInSeconds })
		} else {
			await (this.redis as any).set(key, value)
		}
	}

	/**
	 * 刪除指定的鍵
	 * @param key - 鍵名
	 */
	async del(key: string): Promise<void> {
		await this.redis.del(key)
	}

	/**
	 * 檢查鍵是否存在
	 * @param key - 鍵名
	 * @returns 是否存在
	 */
	async exists(key: string): Promise<boolean> {
		return (await (this.redis as any).exists(key)) > 0
	}

	/**
	 * 將資料推入列表 (隊列生產者)
	 */
	async rpush(key: string, value: string): Promise<number> {
		return (this.redis as any).rpush(key, value)
	}

	/**
	 * 從列表彈出資料 (隊列消費者)
	 */
	async lpop(key: string): Promise<string | null> {
		return (this.redis as any).lpop(key)
	}
}
