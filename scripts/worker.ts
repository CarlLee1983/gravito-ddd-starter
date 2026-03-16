#!/usr/bin/env bun

/**
 * @file worker.ts
 * @description 獨立隊列 Worker CLI 入口
 *
 * 用於以獨立進程運行背景隊列任務。
 *
 * 用法：
 * ```bash
 * # 使用預設配置（memory 驅動，system_jobs_queue）
 * bun scripts/worker.ts
 *
 * # 使用 Redis 驅動
 * EVENT_DRIVER=redis bun scripts/worker.ts
 *
 * # 指定特定隊列（若隊列實現支援）
 * bun scripts/worker.ts --queue=emails,notifications
 *
 * # 覆蓋環境驅動
 * bun scripts/worker.ts --driver=rabbitmq
 * ```
 *
 * 優雅關閉：
 * - 發送 SIGTERM 或 SIGINT 信號將觸發優雅關閉
 * - Worker 會等待當前正在執行的 Job 完成（30 秒超時）
 * - 之後安全地退出進程
 *
 * @example
 * ```bash
 * # 啟動 Worker
 * EVENT_DRIVER=redis bun scripts/worker.ts
 *
 * # 在另一個終端優雅關閉
 * kill -TERM <pid>
 * ```
 */

import type { IQueueWorker } from '../app/Foundation/Application/Jobs/IQueueWorker'

/**
 * 解析命令行參數
 */
function parseArguments(): Record<string, string> {
	const args: Record<string, string> = {}

	for (const arg of Bun.argv.slice(2)) {
		const [key, value] = arg.split('=')
		if (key.startsWith('--')) {
			args[key.slice(2)] = value || 'true'
		}
	}

	return args
}

/**
 * 主程序
 */
async function main() {
	const args = parseArguments()

	// 處理命令行參數
	if (args.driver) {
		process.env.EVENT_DRIVER = args.driver
	}

	const driver = process.env.EVENT_DRIVER || 'memory'
	console.log(`
╔════════════════════════════════════════╗
║       Queue Worker - gravito-ddd       ║
╚════════════════════════════════════════╝

📍 Driver: ${driver}
🔧 PID: ${process.pid}
⏰ Started: ${new Date().toISOString()}
  `)

	try {
		// 動態導入 bootstrap（確保環境變量已設置）
		const { bootstrap } = await import('../bootstrap')
		const core = await bootstrap()

		// 取得 Worker 實例
		let worker: IQueueWorker | null = null

		try {
			worker = core.container.make('systemWorker') as IQueueWorker
		} catch (error) {
			console.error('❌ Failed to resolve Worker from container:')
			console.error(error instanceof Error ? error.message : error)
			process.exit(1)
		}

		// 啟動 Worker
		await worker.start()
		console.log('✅ Worker started successfully\n')

		// 設置優雅關閉處理器
		let isShuttingDown = false

		async function gracefulShutdown(signal: string) {
			if (isShuttingDown) return
			isShuttingDown = true

			console.log(`\n⏹️  Received ${signal}, shutting down gracefully...`)

			// 停止接受新的 Job
			worker?.stop()

			// 等待當前 Job 完成（30 秒超時）
			try {
				console.log('⏳ Waiting for active jobs to complete...')
				await worker?.waitForIdle(30000)
				console.log('✅ All jobs completed')
			} catch (error) {
				console.warn('⚠️  Job completion timeout or error:', error instanceof Error ? error.message : error)
			}

			console.log('👋 Shutting down worker process')
			process.exit(0)
		}

		// 監聽終止信號
		process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
		process.on('SIGINT', () => gracefulShutdown('SIGINT'))

		// 無限等待（直至收到關閉信號）
		await new Promise(() => {})
	} catch (error) {
		console.error('❌ Failed to start worker:')
		console.error(error)
		process.exit(1)
	}
}

// 執行
main().catch((error) => {
	console.error('Fatal error:', error)
	process.exit(1)
})
