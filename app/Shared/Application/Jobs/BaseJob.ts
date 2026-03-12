/**
 * @file BaseJob.ts
 * @description Queue 系統的抽象 Job 基底類別
 *
 * 提供通用的 Job 配置：
 * - jobName: Job 識別碼（用於路由到正確的 Handler）
 * - tries: 重試次數
 * - backoff: 重試延遲（秒）
 * - delay: 初始延遲（秒）
 * - handle(): 實際業務邏輯
 *
 * Role: Application Layer
 */

/**
 * Job 中繼資料
 */
export interface JobMeta {
	/** Job 識別碼 */
	jobName: string
	/** 重試次數 */
	tries: number
	/** 重試延遲（秒） */
	backoff: number
	/** 初始延遲（秒） */
	delay: number
}

/**
 * Job 負載格式
 *
 * 用於在隊列中序列化 Job，包含：
 * - meta: Job 配置元資料
 * - data: Job 業務資料
 * - attempt: 當前執行次數
 * - enqueuedAt: 入隊時間戳
 */
export interface JobPayload<TData = unknown> {
	/** Job 配置 */
	meta: JobMeta
	/** Job 業務資料 */
	data: TData
	/** 當前執行次數（從 1 開始） */
	attempt: number
	/** 入隊時間戳（ISO 8601） */
	enqueuedAt: string
}

/**
 * Queue Job 抽象基底類別
 *
 * @template TData - Job 業務資料型別
 *
 * @example
 * ```typescript
 * export class SendWelcomeEmailJob extends BaseJob<SendWelcomeEmailData> {
 *   readonly jobName = 'user.send_welcome_email'
 *   readonly tries = 3
 *   readonly backoff = 60  // 秒
 *   readonly delay = 0
 *
 *   constructor(private mailer: IMailer) {}
 *
 *   async handle(data: SendWelcomeEmailData): Promise<void> {
 *     await this.mailer.send({
 *       to: data.email,
 *       subject: 'Welcome!',
 *       body: '...'
 *     })
 *   }
 * }
 * ```
 */
export abstract class BaseJob<TData = Record<string, unknown>> {
	/**
	 * Job 識別碼（必須實作）
	 * 用於隊列識別與路由
	 * 慣例：`{module}.{action}`，如 `user.send_welcome_email`
	 */
	abstract readonly jobName: string

	/**
	 * 重試次數（預設：3）
	 * 表示 Job 失敗後可重試的最大次數
	 */
	readonly tries: number = 3

	/**
	 * 重試延遲（預設：60 秒）
	 * 重試時 Job 將延遲執行的時間（秒）
	 */
	readonly backoff: number = 60

	/**
	 * 初始延遲（預設：0 秒）
	 * Job 入隊後，延遲多長時間才開始執行
	 */
	readonly delay: number = 0

	/**
	 * Job 業務邏輯實作（必須實作）
	 *
	 * @param data - Job 負載資料
	 * @throws 若拋出異常，Job 將被標記為失敗，並依 tries/backoff 配置重試
	 */
	abstract handle(data: TData): Promise<void>

	/**
	 * 獲取 Job 的中繼資料
	 *
	 * @returns Job 配置物件
	 */
	toJobMeta(): JobMeta {
		return {
			jobName: this.jobName,
			tries: this.tries,
			backoff: this.backoff,
			delay: this.delay,
		}
	}

	/**
	 * 構建 Job 負載
	 *
	 * 將 Job 與其資料轉換為可序列化的 JobPayload 格式
	 *
	 * @param data - Job 業務資料
	 * @param attempt - 當前執行次數（預設：1）
	 * @returns Job 負載物件
	 */
	toJobPayload(data: TData, attempt: number = 1): JobPayload<TData> {
		return {
			meta: this.toJobMeta(),
			data,
			attempt,
			enqueuedAt: new Date().toISOString(),
		}
	}
}
