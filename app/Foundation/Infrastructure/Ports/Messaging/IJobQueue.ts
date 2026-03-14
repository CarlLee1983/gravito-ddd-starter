/**
 * @file IJobQueue.ts
 * @description 通用背景工作隊列介面 (Port)
 */

/**
 * 代表一個背景工作
 */
export interface Job<T = any> {
	/** 工作類型 (用於路由到 Handler) */
	name: string
	/** 酬載資料 */
	data: T
	/** 優先級 (選填) */
	priority?: number
	/** 重試次數 (選填) */
	attempts?: number
}

/**
 * 背景工作處理程序
 */
export type JobHandler<T = any> = (data: T) => Promise<void> | void

/**
 * 工作隊列介面
 */
export interface IJobQueue {
	/**
	 * 推送工作到隊列
	 */
	push<T>(name: string, data: T): Promise<void>

	/**
	 * 註冊工作處理程序
	 */
	process(name: string, handler: JobHandler): void
}
