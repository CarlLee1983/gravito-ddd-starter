/**
 * Cache 服務介面（Port）
 *
 * 底層完全不知道 Gravito/Stasis 的存在，
 * 允許日後換框架或用 InMemory 實作進行測試。
 */
export interface ICacheService {
	/**
	 * 取得快取值，key 不存在時回傳 null
	 */
	get<T = unknown>(key: string): Promise<T | null>

	/**
	 * 設定快取值
	 *
	 * @param key - 快取 key
	 * @param value - 快取值
	 * @param ttlSeconds - 選擇性的 TTL（秒），0 表示永不到期
	 */
	set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void>

	/**
	 * 刪除快取項目
	 */
	forget(key: string): Promise<void>

	/**
	 * 清空所有快取
	 */
	flush(): Promise<void>
}
