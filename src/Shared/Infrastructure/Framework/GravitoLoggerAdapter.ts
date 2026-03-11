/**
 * @file GravitoLoggerAdapter.ts
 * @description 對接 @gravito/sentinel 的日誌適配器
 */

import type { ILogger } from '../ILogger'
import { Sentinel } from '@gravito/sentinel'

export class GravitoLoggerAdapter implements ILogger {
	private sentinel: Sentinel

	constructor() {
		this.sentinel = new Sentinel()
	}

	info(message: string, context?: Record<string, any>): void {
		this.sentinel.info(message, context)
	}

	error(message: string, error?: Error | unknown, context?: Record<string, any>): void {
		this.sentinel.error(message, { error, ...context })
	}

	warn(message: string, context?: Record<string, any>): void {
		this.sentinel.warn(message, context)
	}

	debug(message: string, context?: Record<string, any>): void {
		this.sentinel.debug(message, context)
	}
}
