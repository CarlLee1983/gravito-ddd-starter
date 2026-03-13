/**
 * @file RedisJobQueueAdapter.ts
 * @description 基於 Redis 的通用工作隊列適配器
 */

import type { IJobQueue, JobHandler } from '../../Ports/Messaging/IJobQueue'
import type { IRedisService } from '../../Ports/Messaging/IRedisService'
import type { ILogger } from '../../Ports/Services/ILogger'

export class RedisJobQueueAdapter implements IJobQueue {
	private readonly queueKey = 'system_jobs_queue'
	private handlers: Map<string, JobHandler> = new Map()
	private logger: ILogger = {
		info: (msg: string) => console.info(`[RedisJobQueueAdapter] ${msg}`),
		warn: (msg: string) => console.warn(`[RedisJobQueueAdapter] ${msg}`),
		error: (msg: string, err?: any) => console.error(`[RedisJobQueueAdapter] ${msg}`, err),
		debug: (msg: string) => console.debug(`[RedisJobQueueAdapter] ${msg}`),
	}

	constructor(private readonly redis: IRedisService) {}

	/**
	 * 推送工作
	 */
	async push<T>(name: string, data: T): Promise<void> {
		const payload = JSON.stringify({ name, data })
		await this.redis.rpush(this.queueKey, payload)
		this.logger.debug(`工作已入隊: ${name}`)
	}

	/**
	 * 註冊處理程序
	 */
	process(name: string, handler: JobHandler): void {
		this.handlers.set(name, handler)
	}

	/**
	 * 供 Worker 調用的內部執行方法
	 * @internal
	 */
	async execute(name: string, data: any): Promise<void> {
		const handler = this.handlers.get(name)
		if (handler) {
			await handler(data)
		} else {
			this.logger.warn(`找不到工作處理程序: ${name}`)
		}
	}
}
