/**
 * Redis 服務介面（Port）
 *
 * @module IRedisService
 * @description
 * 定義 Redis 存取的抽象介面。
 * 允許日後更換 Redis 驅動或使用 InMemory 實作進行測試。
 *
 * **DDD 角色**
 * - 基礎建設：Infrastructure Port (Redis)
 * - 職責：提供統一的 Redis 操作介面。
 */

export interface IRedisService {
	/**
	 * 連線測試
	 *
	 * @returns {Promise<string>} 回傳 'PONG' 或拋出例外
	 */
	ping(): Promise<string>

	/**
	 * 取得字串值
	 *
	 * @param {string} key - Redis key
	 * @returns {Promise<string | null>} key 不存在時回傳 null
	 */
	get(key: string): Promise<string | null>

	/**
	 * 設定字串值
	 *
	 * @param {string} key - Redis key
	 * @param {string} value - 字串值
	 * @param {number} [expiresInSeconds] - 可選的到期時間（秒）
	 * @returns {Promise<void>}
	 */
	set(key: string, value: string, expiresInSeconds?: number): Promise<void>

	/**
	 * 刪除 key
	 *
	 * @param {string} key - 要刪除的 key
	 * @returns {Promise<void>}
	 */
	del(key: string): Promise<void>

	/**
	 * 檢查 key 是否存在
	 *
	 * @param {string} key - Redis key
	 * @returns {Promise<boolean>} 是否存在
	 */
	exists(key: string): Promise<boolean>

	/**
	 * 將值推入列表尾部 (隊列生產者)
	 * @param key - 隊列名稱
	 * @param value - 序列化的資料
	 */
	rpush(key: string, value: string): Promise<number>

	/**
	 * 從列表頭部取出值 (隊列消費者)
	 * @param key - 隊列名稱
	 */
	lpop(key: string): Promise<string | null>
}
