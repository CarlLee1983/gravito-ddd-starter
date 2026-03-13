/**
 * @file dispatchJob.ts
 * @description 推送 Job 到隊列的 Helper 函數
 *
 * 封裝 IJobQueue.push()，自動構建 JobPayload 格式
 * 讓 Handler 可以簡潔地 dispatch Job
 *
 * 使用範例：
 * ```typescript
 * import { dispatchJob } from '@/Shared/Application/Jobs/dispatchJob'
 * import { SendWelcomeEmailJob } from '@/Modules/User/Application/Jobs/SendWelcomeEmailJob'
 *
 * export class SendWelcomeEmail {
 *   constructor(private jobQueue: IJobQueue) {}
 *
 *   async handle(event: UserCreated) {
 *     await dispatchJob(this.jobQueue, new SendWelcomeEmailJob(), {
 *       userId: event.userId,
 *       email: event.email,
 *       name: event.name
 *     })
 *   }
 * }
 * ```
 */

import type { IJobQueue } from '@/Shared/Infrastructure/Ports/Messaging/IJobQueue'
import type { BaseJob } from './BaseJob'

/**
 * 推送 Job 到隊列
 *
 * @template TData - Job 業務資料型別
 * @param queue - IJobQueue 實例
 * @param job - BaseJob 實例
 * @param data - Job 業務資料
 * @throws 若 queue.push() 失敗，異常將傳播
 *
 * @example
 * ```typescript
 * await dispatchJob(jobQueue, new SendWelcomeEmailJob(), {
 *   userId: 'usr-123',
 *   email: 'user@example.com',
 *   name: 'John Doe'
 * })
 * ```
 */
export async function dispatchJob<TData>(
	queue: IJobQueue,
	job: BaseJob<TData>,
	data: TData,
): Promise<void> {
	const payload = job.toJobPayload(data)
	const jobName = job.jobName
	await queue.push(jobName, payload)
}
