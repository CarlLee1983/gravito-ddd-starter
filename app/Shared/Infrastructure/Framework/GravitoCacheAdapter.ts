/**
 * @file GravitoCacheAdapter.ts
 * @description Gravito 快取服務適配器
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：實作 ICacheService 介面。
 * - 職責：將 Gravito 框架中的 Stasis 快取管理員適配為系統定義的快取通訊協定，實現技術細節的隔離。
 */

import type { ICacheService } from '@/Shared/Infrastructure/ICacheService'
import type { CacheManager } from '@gravito/stasis'

/**
 * 適配器類別：將 Gravito Stasis CacheManager 適配為全域通用的 ICacheService
 */
export class GravitoCacheAdapter implements ICacheService {
	/**
	 * 建構子
	 * @param cache - 原始的 Gravito 快取管理員實例
	 */
	constructor(private readonly cache: CacheManager) {}

	/**
	 * 取得指定鍵值的快取內容
	 * @param key - 鍵名
	 * @returns 快取值或 null
	 */
	async get<T = unknown>(key: string): Promise<T | null> {
		return this.cache.get<T>(key)
	}

	/**
	 * 設定快取內容
	 * @param key - 鍵名
	 * @param value - 資料內容
	 * @param ttlSeconds - 有效時間 (秒)
	 */
	async set<T = unknown>(
		key: string,
		value: T,
		ttlSeconds?: number,
	): Promise<void> {
		await this.cache.set(key, value, ttlSeconds)
	}

	/**
	 * 刪除特定的快取項目
	 * @param key - 鍵名
	 */
	async forget(key: string): Promise<void> {
		await this.cache.forget(key)
	}

	/**
	 * 清空所有快取資料
	 */
	async flush(): Promise<void> {
		await this.cache.flush()
	}
}
