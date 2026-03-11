/**
 * @file GravitoLoggerAdapter.ts
 * @description 對接 @gravito/sentinel 的日誌適配器
 */

import type { ILogger } from '../ILogger'

export class GravitoLoggerAdapter implements ILogger {
	info(message: string, _context?: Record<string, any>): void {
		console.info(`[INFO] ${message}`)
	}

	error(message: string, error?: Error | unknown, _context?: Record<string, any>): void {
		console.error(`[ERROR] ${message}`, error)
	}

	warn(message: string, _context?: Record<string, any>): void {
		console.warn(`[WARN] ${message}`)
	}

	debug(message: string, _context?: Record<string, any>): void {
		console.debug(`[DEBUG] ${message}`)
	}
}
