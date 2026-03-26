/**
 * @file IRateLimiter.ts
 * @description 限流器介面（Port）
 *
 * 使用 Sliding Window 算法實現基於時間窗口的限流。
 * 支援記憶體與分散式 Redis 實現。
 *
 * **DDD 角色**
 * - 基礎設施層：Infrastructure Port (Services)
 * - 職責：請求流量控制、防止濫用
 * - 使用場景：API 速率限制、優惠券搶購、批量操作防刷
 *
 * **設計特點**
 * - Sliding Window 算法：精確的時間窗口控制
 * - 記憶體實現：本地開發、單機部署
 * - Redis 實現：分散式環境、多機器共享額度
 * - 原子操作：避免競態條件（Redis 版本用 Lua Script）
 * - 冪等性：重複呼叫返回相同結果
 *
 * **Sliding Window 演算法**
 * ```
 * 時間軸：|← 窗口（60s）→|← 新窗口 →|
 *   請求：A B C D     E F G     H I
 *時間點：0 5 10 15    65 70 75  125
 * 計數：4/5          3/5 (E 是窗口起點)
 * ```
 */

/**
 * 限流結果
 */
export interface RateLimitResult {
	/**
	 * 是否允許此次請求
	 * - true：在額度內，可以繼續
	 * - false：超過限制，應拒絕或排隊
	 */
	allowed: boolean

	/**
	 * 剩餘的請求配額
	 *
	 * - 若 allowed=true，表示此次呼叫後剩餘配額
	 * - 若 allowed=false，表示距離下次允許還需多少配額
	 */
	remaining: number

	/**
	 * 額度重置時間
	 *
	 * 表示當前時間窗口何時結束，可用於客戶端提示何時重試。
	 *
	 * @example
	 * ```typescript
	 * const result = await rateLimiter.check('user:123', 5, 60000)
	 * if (!result.allowed) {
	 *   const waitSeconds = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
	 *   return res.status(429).json({
	 *     error: 'Rate limit exceeded',
	 *     retryAfter: waitSeconds
	 *   })
	 * }
	 * ```
	 */
	resetAt: Date
}

/**
 * 限流器異常
 *
 * 用於表示請求超過限流額度。
 */
export class RateLimitExceededException extends Error {
	constructor(
		public readonly resetAt: Date,
		message?: string
	) {
		super(message || 'Rate limit exceeded')
		this.name = 'RateLimitExceededException'
	}
}

/**
 * 限流器介面
 *
 * @example
 * ```typescript
 * // 基於使用者的限流
 * const result = await rateLimiter.check(
 *   \`user:\${userId}\`,
 *   5,       // limit: 每分鐘最多 5 次
 *   60000    // windowMs: 時間窗口 60 秒
 * )
 *
 * if (!result.allowed) {
 *   throw new RateLimitExceededException(
 *     result.resetAt,
 *     \`Too many attempts, retry after \${result.resetAt}\`
 *   )
 * }
 *
 * // 基於 IP 的限流（防止 DDoS）
 * const ipLimit = await rateLimiter.check(
 *   \`ip:\${clientIp}\`,
 *   100,     // limit: 每分鐘最多 100 個請求
 *   60000
 * )
 * ```
 */
export interface IRateLimiter {
	/**
	 * 檢查是否允許請求
	 *
	 * Sliding Window 邏輯：
	 * 1. 計算當前時間窗口範圍 [now - windowMs, now]
	 * 2. 移除該窗口外的舊請求記錄
	 * 3. 計算窗口內的請求數
	 * 4. 若 < limit，接受請求（計數 +1）；否則拒絕
	 * 5. 返回 result（allowed、remaining、resetAt）
	 *
	 * **冪等性**
	 * - 相同的 key、limit、windowMs 在同一窗口內呼叫多次，結果相同
	 * - 適合網路重試、分散式環境
	 *
	 * **分散式環境**
	 * - Redis 實現使用 Lua Script 保證原子性，避免競態
	 * - 可跨多個進程/機器共享額度計數
	 *
	 * @param key - 限流識別碼
	 *   - 使用者級別：\`user:\${userId}\`
	 *   - IP 級別：\`ip:\${clientIp}\`
	 *   - API 級別：\`api:\${endpoint}\`
	 *
	 * @param limit - 時間窗口內允許的最大請求數
	 *   - 常見值：5（優惠券搶購）、100（API 限流）、1000（批量操作）
	 *
	 * @param windowMs - 時間窗口大小（毫秒）
	 *   - 常見值：60000（1 分鐘）、3600000（1 小時）
	 *
	 * @returns RateLimitResult - 包含 allowed、remaining、resetAt
	 *
	 * @example
	 * ```typescript
	 * // 優惠券搶購：每使用者每分鐘最多 5 次
	 * const result = await rateLimiter.check(\`coupon:\${userId}\`, 5, 60000)
	 * if (!result.allowed) {
	 *   return res.status(429).json({
	 *     error: 'Too many attempts',
	 *     remaining: result.remaining,
	 *     resetAt: result.resetAt.toISOString()
	 *   })
	 * }
	 * ```
	 */
	check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>

	/**
	 * 重置指定 key 的限流計數
	 *
	 * 適用於：
	 * - 人工重置（例如管理員給予特殊許可）
	 * - 測試環境清理
	 * - 使用者申請額度復原
	 *
	 * @param key - 要重置的限流識別碼
	 *
	 * @example
	 * ```typescript
	 * // 管理員為某使用者重置限流
	 * await rateLimiter.reset(\`user:\${userId}\`)
	 * logger.info(\`Rate limit reset for user \${userId}\`)
	 * ```
	 */
	reset(key: string): Promise<void>
}
