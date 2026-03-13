/**
 * @file JobRegistry.ts
 * @description 中心化 Job 處理程序登錄表
 *
 * 集中管理隊列 Job 的處理程序，提供清晰、可追蹤的 Job 路由。
 *
 * 設計目標：
 * - 統一註冊 Job Handler，避免分散在各 Module ServiceProvider 中
 * - 提供一個統一視窗，查看所有已註冊的 Job Handler
 * - 支援 jobQueue.process() 的自動綁定
 *
 * 使用流程：
 * 1. 在 Module 的 ServiceProvider.register() 中呼叫 JobRegistry.register()
 * 2. 在 SharedServiceProvider.boot() 中呼叫 JobRegistry.bindAll()
 *
 * @example
 * ```typescript
 * // 在 User Module ServiceProvider 中
 * override register(container: IContainer): void {
 *   container.singleton('sendWelcomeEmailJob', (c) => new SendWelcomeEmailJob(...))
 *
 *   JobRegistry.register({
 *     moduleName: 'User',
 *     jobs: [
 *       { jobName: 'user.send_welcome_email', jobFactory: (c) => c.make('sendWelcomeEmailJob') }
 *     ]
 *   })
 * }
 *
 * // 在 SharedServiceProvider.boot() 中
 * override boot(core: any): void {
 *   const jobQueue = core.container.make('jobQueue')
 *   JobRegistry.bindAll(jobQueue, core.container)
 * }
 * ```
 */

import type { IJobQueue, JobHandler } from '../Ports/Messaging/IJobQueue'
import type { IContainer } from '../Ports/Core/IServiceProvider'
import type { BaseJob, JobPayload } from '../../Application/Jobs/BaseJob'

/**
 * Job 處理程序定義
 */
export interface IJobDefinition {
	/** Job 識別碼（必須與 Job.jobName 相符） */
	jobName: string
	/** Job 實例工廠函數（從容器解析） */
	jobFactory: (container: IContainer) => BaseJob
}

/**
 * Module Job 集合
 */
export interface IModuleJobs {
	/** Module 名稱（用於日誌與調試） */
	moduleName: string
	/** 此 Module 的 Job 定義列表 */
	jobs: IJobDefinition[]
}

/**
 * 中心化 Job 處理程序登錄表
 *
 * 用於集中管理應用中所有的 Job 定義與處理邏輯
 */
export class JobRegistry {
	/**
	 * 註冊的 Job 定義集合
	 * 鍵：Module 名稱
	 * 值：Module 的 Job 定義列表
	 */
	private static readonly jobs = new Map<string, IModuleJobs>()

	/**
	 * 由 Module 呼叫，向 Registry 註冊其 Job 定義
	 *
	 * 此方法應在 Module ServiceProvider.register() 中呼叫
	 *
	 * @param moduleJobs - Module 的 Job 定義
	 *
	 * @example
	 * ```typescript
	 * JobRegistry.register({
	 *   moduleName: 'User',
	 *   jobs: [
	 *     { jobName: 'user.send_welcome_email', jobFactory: (c) => c.make('sendWelcomeEmailJob') }
	 *   ]
	 * })
	 * ```
	 */
	static register(moduleJobs: IModuleJobs): void {
		const existing = this.jobs.get(moduleJobs.moduleName)
		if (existing) {
			// 合併新增的 Job（同一 Module 可能在不同層註冊）
			existing.jobs.push(...moduleJobs.jobs)
		} else {
			this.jobs.set(moduleJobs.moduleName, moduleJobs)
		}

		if (process.env.NODE_ENV === 'development') {
			console.log(
				`[JobRegistry] Registered ${moduleJobs.jobs.length} jobs for module: ${moduleJobs.moduleName}`
			)
		}
	}

	/**
	 * 將所有已註冊的 Job 處理程序綁定到 JobQueue
	 *
	 * 此方法應在 SharedServiceProvider.boot() 中呼叫，在所有 Module 的 register() 完成後
	 *
	 * @param jobQueue - IJobQueue 實例
	 * @param container - IContainer 實例（用於解析 Job）
	 *
	 * @example
	 * ```typescript
	 * override boot(core: any): void {
	 *   const jobQueue = core.container.make('jobQueue')
	 *   JobRegistry.bindAll(jobQueue, core.container)
	 * }
	 * ```
	 */
	static bindAll(jobQueue: IJobQueue, container: IContainer): void {
		let totalBound = 0

		for (const [moduleName, moduleJobs] of this.jobs.entries()) {
			for (const jobDef of moduleJobs.jobs) {
				try {
					const jobInstance = jobDef.jobFactory(container)

					// 為每個 Job 註冊處理程序
					// JobPayload 格式包含 meta + data，jobQueue.process() 負責解析和路由
					const handler: JobHandler = async (payload: JobPayload) => {
						try {
							// 執行 Job.handle()
							await jobInstance.handle(payload.data as Record<string, unknown>)
						} catch (error) {
							// 錯誤處理由 jobQueue 決定是否重試
							// 此處拋出異常告訴隊列該 Job 執行失敗
							throw error
						}
					}

					jobQueue.process(jobDef.jobName, handler)
					totalBound++

					if (process.env.NODE_ENV === 'development') {
						console.log(
							`  ✓ [${moduleName}] Registered job handler for: ${jobDef.jobName}`
						)
					}
				} catch (error) {
					console.warn(
						`⚠️  [${moduleName}] Failed to register job handler for: ${jobDef.jobName}`,
						error instanceof Error ? error.message : error
					)
				}
			}
		}

		console.log(`🔗 [JobRegistry] Successfully bound ${totalBound} job handlers`)
	}

	/**
	 * 清空所有已註冊的 Job 定義
	 *
	 * 僅用於測試環境，測試前清空狀態
	 */
	static clear(): void {
		this.jobs.clear()
	}

	/**
	 * 取得所有已註冊的 Job 定義（用於調試、測試）
	 *
	 * @returns 所有已註冊的 Module Job 定義
	 */
	static getAll(): IModuleJobs[] {
		return Array.from(this.jobs.values())
	}

	/**
	 * 取得特定 Module 的已註冊 Job 定義（用於調試、測試）
	 *
	 * @param moduleName - Module 名稱
	 * @returns Module 的 Job 定義列表，若未註冊則回傳 undefined
	 */
	static getByModule(moduleName: string): IModuleJobs | undefined {
		return this.jobs.get(moduleName)
	}
}
