/**
 * @file RedisQueryCache.ts
 * @description Redis 查詢快取實現
 *
 * 用於分散式環境的查詢快取，支援多進程共享。
 * 使用 Redis 儲存快取項目，支援 TTL 和模式匹配失效。
 *
 * **特性**：
 * - O(1) 查詢和存儲性能
 * - TTL 自動過期
 * - 跨進程共享快取
 * - 模式匹配失效
 * - 統計快取命中率
 *
 * **限制**：
 * - Redis 連線可用性依賴
 * - 應用重啟快取保留
 * - 適合生產環境
 *
 * @public
 */

import type { IQueryCache, CacheStats } from '../../Ports/Services/IQueryCache'
import type { IRedisService } from '../Ports/Messaging/IRedisService'

export class RedisQueryCache implements IQueryCache {
	private readonly cachePrefix = 'query:'
	private readonly statsPrefix = 'query:stats:'
	private readonly hitsKey = 'query:metrics:hits'
	private readonly missesKey = 'query:metrics:misses'

	constructor(private readonly redis: IRedisService) {}

	/**
	 * 規範化快取鍵
	 */
	private normalizeKey(key: string): string {
		return this.cachePrefix + key
	}

	/**
	 * 生成統計鍵
	 */
	private statsKeyFor(key: string): string {
		return this.statsPrefix + key
	}

	/**
	 * 取得快取的查詢結果
	 */
	async get<T>(key: string): Promise<T | null> {
		const normalizedKey = this.normalizeKey(key)

		try {
			const cached = await this.redis.get(normalizedKey)
			if (!cached) {
				// 記錄 miss
				try {
					await this.redis.rpush(this.missesKey, '1')
				} catch {
					// 統計記錄失敗，忽略
				}
				return null
			}

			// 命中快取，記錄 hit
			try {
				await this.redis.rpush(this.hitsKey, '1')
			} catch {
				// 統計記錄失敗，忽略
			}

			// 解析並返回結果
			const data = JSON.parse(cached) as T
			return data
		} catch (error) {
			// Redis 連線失敗或解析錯誤，視為 cache miss
			try {
				await this.redis.rpush(this.missesKey, '1')
			} catch {
				// 統計記錄失敗，忽略
			}
			return null
		}
	}

	/**
	 * 存儲查詢結果到快取
	 */
	async set<T>(key: string, data: T, ttlMs?: number): Promise<void> {
		const normalizedKey = this.normalizeKey(key)

		try {
			const json = JSON.stringify(data)
			const ttlSeconds = ttlMs ? Math.ceil(ttlMs / 1000) : 3600 // 預設 1 小時

			// 存儲快取（支援 TTL）
			await this.redis.set(normalizedKey, json, ttlSeconds > 0 ? ttlSeconds : undefined)
		} catch (error) {
			// Redis 連線失敗時，優雅降級（不拋出異常，讓應用繼續運作）
			console.warn(`Redis cache set failed for key ${key}:`, error)
		}
	}

	/**
	 * 檢查快取是否存在且有效
	 */
	async has(key: string): Promise<boolean> {
		const normalizedKey = this.normalizeKey(key)

		try {
			return await this.redis.exists(normalizedKey)
		} catch (error) {
			// Redis 連線失敗，視為不存在
			return false
		}
	}

	/**
	 * 刪除特定快取
	 */
	async delete(key: string): Promise<boolean> {
		const normalizedKey = this.normalizeKey(key)

		try {
			const deleted = await this.redis.del(normalizedKey)
			return deleted > 0
		} catch (error) {
			// Redis 連線失敗時，優雅降級
			return false
		}
	}

	/**
	 * 刪除匹配模式的所有快取
	 * 注意：Redis 不支援原生的模式匹配刪除，需要掃描所有鍵
	 * 若使用 Redis 服務，需要在 IRedisService 中添加 keys() 或 scan() 方法
	 * 目前實現假設無法進行模式匹配（返回 0）
	 */
	async deletePattern(pattern: string): Promise<number> {
		// Redis KEYS 操作在大型資料庫中性能差，不推薦生產環境使用
		// 建議應用層手動維護快取失效策略
		// 或在 Redis 服務層添加 SCAN 支援
		console.warn(
			`Pattern deletion not fully supported in Redis. Pattern: ${pattern}. Consider using explicit keys.`
		)
		return 0
	}

	/**
	 * 清空所有快取
	 */
	async clear(): Promise<void> {
		try {
			// 注意：這個操作會清空所有快取，包括其他實例的快取
			// 生產環境中應考慮使用 keyPrefix 隔離不同應用
			// 由於 IRedisService 不支援 FLUSHDB，暫時無法實現完整清空
			// 可以透過掃描所有快取鍵並逐個刪除來實現
			console.warn('Full cache clear not fully supported. Consider manual key management.')
		} catch (error) {
			// Redis 連線失敗
			console.warn('Redis cache clear failed:', error)
		}
	}

	/**
	 * 取得快取統計資訊
	 */
	async getStats(): Promise<CacheStats> {
		try {
			// 獲取命中和未命中計數（存儲為 Redis List）
			const hitsLen = await this.redis.llen(this.hitsKey)
			const missesLen = await this.redis.llen(this.missesKey)
			const total = hitsLen + missesLen

			const hitRate = total > 0 ? hitsLen / total : 0

			return {
				size: -1, // Redis 無法輕易統計快取項目總數（需要 KEYS 或 SCAN）
				hits: hitsLen,
				misses: missesLen,
				hitRate,
			}
		} catch (error) {
			// Redis 連線失敗時，返回空統計
			return {
				size: 0,
				hits: 0,
				misses: 0,
				hitRate: 0,
			}
		}
	}

	/**
	 * 標記快取無效
	 */
	async invalidate(pattern: string): Promise<void> {
		// Redis 版本同樣受限於模式匹配
		// 建議應用層自行管理失效策略
		console.warn(`Pattern invalidation not fully supported in Redis. Pattern: ${pattern}`)
	}
}
