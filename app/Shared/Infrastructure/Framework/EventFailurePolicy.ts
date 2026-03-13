/**
 * @file EventFailurePolicy.ts
 * @description 事件失敗策略和相關數據結構
 *
 * 定義事件分發失敗時的重試策略、死信隊列等機制
 * 用於確保事件系統的可靠性
 */

/**
 * Handler 執行結果
 */
export interface HandlerExecutionResult {
	/** Handler 是否執行成功 */
	success: boolean
	/** Handler 名稱或類型 */
	handlerName: string
	/** 執行錯誤（若失敗） */
	error?: Error
	/** 執行嘗試次數 */
	attempts: number
	/** 下次重試的時間戳 (Unix milliseconds) */
	nextRetry?: number
}

/**
 * 死信隊列條目（事件失敗後的持久化記錄）
 */
export interface DeadLetterEntry {
	/** 唯一識別碼 */
	id: string
	/** 事件名稱 */
	eventName: string
	/** 事件序列化數據 */
	eventData: Record<string, any>
	/** 錯誤訊息 */
	error: string
	/** 已嘗試的次數 */
	attempts: number
	/** 失敗的時刻 (ISO 字符串) */
	failedAt: string
	/** 是否可重試 */
	retryable: boolean
	/** 失敗原因詳情 */
	reason?: string
}

/**
 * 事件分發器類型
 */
export enum DispatcherType {
	/** 內存分發（同步） */
	MEMORY = 'memory',
	/** Redis 分發（非同步，隊列） */
	REDIS = 'redis',
	/** RabbitMQ 分發（非同步，AMQP） */
	RABBITMQ = 'rabbitmq',
}

/**
 * 重試策略配置
 */
export interface RetryPolicy {
	/** 最大重試次數 */
	maxRetries: number
	/** 初始延遲時間（毫秒） */
	initialDelay: number
	/** 延遲增長因子（指數退避） */
	backoffMultiplier: number
	/** 最大延遲時間（毫秒） */
	maxDelay: number
}

/**
 * 預設重試策略
 * 遵循指數退避策略：
 * - 第 1 次嘗試：立即
 * - 第 2 次重試：1s 後
 * - 第 3 次重試：2s 後
 * - 第 4 次重試：4s 後
 * - 第 5 次重試：8s 後
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
	maxRetries: 4,
	initialDelay: 1000, // 1 秒
	backoffMultiplier: 2,
	maxDelay: 30000, // 30 秒
}

/**
 * 計算延遲時間（指數退避）
 * @param attempt - 當前嘗試次數（從 1 開始）
 * @param policy - 重試策略
 * @returns 延遲時間（毫秒）
 */
export function calculateDelay(attempt: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): number {
	if (attempt <= 1) {
		return 0 // 首次嘗試無延遲
	}

	// 計算延遲：initialDelay × (backoffMultiplier ^ (attempt - 1))
	const delay = policy.initialDelay * Math.pow(policy.backoffMultiplier, attempt - 2)
	return Math.min(delay, policy.maxDelay) // 不超過最大延遲
}

/**
 * 判斷是否應該重試
 * @param error - 發生的錯誤
 * @param attempt - 當前嘗試次數
 * @param maxRetries - 最大重試次數
 * @returns 是否應該重試
 */
export function shouldRetry(error: unknown, attempt: number, maxRetries: number): boolean {
	// 已達最大重試次數，不再重試
	if (attempt >= maxRetries) {
		return false
	}

	// 可重試的錯誤類型
	// - 網絡超時、連接失敗等臨時性錯誤
	// - 資源暫時不可用
	const isRetryableError =
		error instanceof Error &&
		(error.message.includes('timeout') ||
			error.message.includes('ECONNREFUSED') ||
			error.message.includes('ECONNRESET') ||
			error.message.includes('temporarily unavailable'))

	return isRetryableError
}
