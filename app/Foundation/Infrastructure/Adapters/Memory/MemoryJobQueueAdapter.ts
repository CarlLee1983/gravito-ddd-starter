/**
 * @file MemoryJobQueueAdapter.ts
 * @description 內存工作隊列適配器（用於測試和開發環境）
 *
 * 實作 IJobQueue 介面，將工作儲存在內存 Map 中，支援：
 * - push(): 推送工作到隊列
 * - process(): 註冊工作處理程序
 * - execute(): 執行單個工作（供 SystemWorker duck-typing 呼叫）
 * - executeAll(): 執行所有待處理工作（測試專用）
 * - queueLength(): 查詢隊列長度（斷言專用）
 *
 * Role: Infrastructure Adapter (Testing)
 */

import type { IJobQueue, JobHandler } from '../../Ports/Messaging/IJobQueue'

/**
 * 內存工作隊列適配器
 *
 * 非生產級別，僅用於單元測試和開發環境。
 * 工作存儲在內存中，應用重啟後會遺失。
 */
export class MemoryJobQueueAdapter implements IJobQueue {
	/** 註冊的工作處理程序映射 */
	private handlers: Map<string, JobHandler> = new Map()

	/** 待處理工作隊列（按工作名稱分類） */
	private queues: Map<string, Array<{ name: string; data: unknown }>> = new Map()

	/**
	 * 推送工作到隊列
	 *
	 * @param name - 工作名稱
	 * @param data - 工作酬載資料
	 */
	async push<T>(name: string, data: T): Promise<void> {
		if (!this.queues.has(name)) {
			this.queues.set(name, [])
		}
		this.queues.get(name)!.push({ name, data })
	}

	/**
	 * 註冊工作處理程序
	 *
	 * @param name - 工作名稱
	 * @param handler - 工作處理程序函數
	 */
	process(name: string, handler: JobHandler): void {
		this.handlers.set(name, handler)
	}

	/**
	 * 執行單個工作（供 SystemWorker duck-typing 呼叫）
	 *
	 * 此方法支援 SystemWorker 的動態呼叫模式，允許 Worker
	 * 根據工作名稱動態路由到相應的處理程序。
	 *
	 * @param name - 工作名稱
	 * @param data - 工作酬載資料
	 * @throws 若工作未找到或處理程序失敗
	 */
	async execute(name: string, data: unknown): Promise<void> {
		const handler = this.handlers.get(name)
		if (!handler) {
			throw new Error(`No handler registered for job: ${name}`)
		}
		await handler(data)
	}

	/**
	 * 執行所有待處理工作（測試專用）
	 *
	 * 模擬 SystemWorker 的行為，依序執行隊列中的所有工作。
	 * 此方法應只用於測試環境驗證工作流程。
	 *
	 * @throws 若任一工作執行失敗，異常會被拋出
	 */
	async executeAll(): Promise<void> {
		for (const [name, jobs] of this.queues.entries()) {
			while (jobs.length > 0) {
				const job = jobs.shift()!
				const handler = this.handlers.get(name)
				if (!handler) {
					throw new Error(`No handler registered for job: ${name}`)
				}
				// job.data 是 JobPayload，從中提取實際的業務資料
				const payload = job.data as any
				const businessData = payload.data || payload
				await handler(businessData)
			}
		}
	}

	/**
	 * 查詢隊列長度（測試斷言專用）
	 *
	 * @param name - 工作名稱
	 * @returns 隊列中的工作數量
	 */
	queueLength(name: string): number {
		return this.queues.get(name)?.length || 0
	}

	/**
	 * 清空所有隊列（測試清理專用）
	 */
	clear(): void {
		this.queues.clear()
	}
}
