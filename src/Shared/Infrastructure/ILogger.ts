/**
 * @file ILogger.ts
 * @description 系統日誌介面 (Port)
 */

export interface ILogger {
	info(message: string, context?: Record<string, any>): void
	error(message: string, error?: Error | unknown, context?: Record<string, any>): void
	warn(message: string, context?: Record<string, any>): void
	debug(message: string, context?: Record<string, any>): void
}
