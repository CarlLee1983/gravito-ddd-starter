/**
 * 快取服務介面（Port）
 *
 * @module ICacheService
 * @description
 * 應用層依賴此介面而非具體框架實作（如 Gravito Stasis）。
 * 支援透過測試框架或其他快取實作進行替換。
 *
 * **DDD 角色**
 * - 基礎建設：Infrastructure Port (Cache)
 * - 職責：標準化快取存取介面。
 */

export interface ICacheService {
	/**
	 * 從快取取得值
	 *
	 * @template T - 回傳資料類型
	 * @param {string} key - 快取 key
	 * @returns {Promise<T | null>} 快取值或 null（不存在或已過期）
	 */
	get<T = unknown>(key: string): Promise<T | null>

	/**
	 * 設定快取值
	 *
	 * @template T - 資料類型
	 * @param {string} key - 快取 key
	 * @param {T} value - 快取值
	 * @param {number} [ttlSeconds] - 生存時間（秒），可選
	 * @returns {Promise<void>}
	 */
	set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void>

	/**
	 * 刪除指定快取
	 *
	 * @param {string} key - 快取 key
	 * @returns {Promise<void>}
	 */
	forget(key: string): Promise<void>

	/**
	 * 清空所有快取
	 *
	 * @returns {Promise<void>}
	 */
	flush(): Promise<void>
}
