/**
 * @file SendWelcomeEmail.ts
 * @description 當用戶建立時，Dispatch 歡迎信 Job 的事件處理程序
 *
 * 角色變更：
 * - 舊：直接使用 IMailer.queue() 發送郵件
 * - 新：使用 IJobQueue 推送 SendWelcomeEmailJob 到隊列
 *
 * 職責：
 * 1. 接收 UserCreated 領域事件
 * 2. 從事件提取必要數據並驗證
 * 3. 推送 Job 資料到隊列
 * 4. 記錄日誌
 *
 * Job 本身會在背景 Worker 進程中執行，支援重試與延遲。
 *
 * 設計流程：
 * ```
 * UserCreated Event
 *   ↓
 * SendWelcomeEmail.handle() ← Event Handler（此類）
 *   ↓
 * jobQueue.push('user.send_welcome_email', JobPayload)
 *   ↓
 * [Backend Worker Process]
 *   ↓
 * SendWelcomeEmailJob.handle() ← Job Handler
 *   ↓
 * IMailer.send() ← 實際郵件發送
 * ```
 */

import { SendWelcomeEmailJob, type SendWelcomeEmailData } from '../Jobs/SendWelcomeEmailJob'
import type { UserCreated } from '../../Domain/Events/UserCreated'
import type { IJobQueue } from '@/Foundation/Infrastructure/Ports/Messaging/IJobQueue'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

/**
 * 歡迎信 Job Dispatcher (事件訂閱者)
 *
 * 此 Handler 是事件驅動流程的一部分，職責單一：
 * - 接收 UserCreated 事件
 * - 提取必要數據
 * - 推送 Job 到隊列
 *
 * Job 的實際執行邏輯在 SendWelcomeEmailJob.handle() 中
 */
export class SendWelcomeEmail {
	constructor(
		private readonly jobQueue: IJobQueue,
		private readonly logger: ILogger,
		private readonly translator: ITranslator
	) {}

	/**
	 * 處理用戶建立事件
	 *
	 * 推送歡迎信 Job 到隊列，實際發送由 Worker 進程完成
	 *
	 * @param event - UserCreated 領域事件
	 */
	async handle(event: UserCreated): Promise<void> {
		const { name, email, userId } = event

		// 1. 使用 Logger 記錄 (多語系日誌)
		const logMsg = this.translator.trans('user.created_log', { id: userId })
		this.logger.info(logMsg)

		// 2. 準備 Job 業務資料
		const jobData: SendWelcomeEmailData = {
			userId,
			name,
			email,
		}

		// 3. 推送歡迎信 Job 到隊列 (由 Worker 進程非同步執行)
		try {
			// 建立 Job 實例（容器會在 JobRegistry.bindAll() 時負責注入依賴）
			// 此處只負責構建 Job 和推送資料
			const job = new SendWelcomeEmailJob(
				null as any, // mailer (由容器在 Worker 中提供)
				this.logger,
				this.translator
			)

			// 推送 Job 到隊列
			// Job 定義中的 jobName='user.send_welcome_email' 用於路由
			const jobMeta = job.toJobMeta()
			const jobPayload = {
				meta: jobMeta,
				data: jobData,
				attempt: 1,
				enqueuedAt: new Date().toISOString(),
			}
			await this.jobQueue.push(jobMeta.jobName, jobPayload)
			this.logger.debug(`[User] Welcome email job dispatched for ${email}`)
		} catch (error) {
			this.logger.error(`[User] Failed to dispatch welcome email job for ${email}`, error)
			throw error // 重新拋出，由事件分發器決定後續處理
		}
	}
}
