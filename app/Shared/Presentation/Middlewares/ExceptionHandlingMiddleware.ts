/**
 * @file ExceptionHandlingMiddleware.ts
 * @description 全局異常處理中間件
 *
 * 責任：
 * - 捕獲 DomainException 及其子類
 * - 自動映射為適當的 HTTP 回應
 * - 統一的錯誤回應格式
 *
 * 設計優勢：
 * - Controller 無需手動處理異常映射
 * - 一致的 API 錯誤格式
 * - 易於擴展和維護
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import { DomainException } from '@/Shared/Domain/Exceptions'

/**
 * API 錯誤回應格式
 */
interface ApiErrorResponse {
	success: false
	error: string
	code?: string
	message: string
	statusCode: number
}

/**
 * 異常處理中間件
 *
 * 在路由管線中使用此中間件來捕獲和處理異常。
 *
 * @example
 * ```typescript
 * router.get('/users', [exceptionHandlingMiddleware], userController.list)
 * ```
 */
export const exceptionHandlingMiddleware: Middleware = async (ctx, next) => {
	try {
		return await next()
	} catch (error) {
		// 處理 DomainException
		if (error instanceof DomainException) {
			const response: ApiErrorResponse = {
				success: false,
				error: error.name,
				code: error.code,
				message: error.message,
				statusCode: error.statusCode,
			}

			return ctx.json(response, error.statusCode)
		}

		// 處理其他錯誤
		const isProduction = process.env.APP_ENV === 'production'
		const response: ApiErrorResponse = {
			success: false,
			error: 'InternalServerError',
			message: isProduction ? '伺服器內部錯誤' : (error as Error).message,
			statusCode: 500,
		}

		return ctx.json(response, 500)
	}
}

/**
 * 建立特定路由的異常處理中間件
 *
 * 允許針對不同路由自訂異常處理邏輯。
 *
 * @example
 * ```typescript
 * const customErrorHandler = createExceptionMiddleware({
 *   onValidationError: (ctx, error) => ctx.json({ ... }, 422)
 * })
 * ```
 */
export interface ExceptionHandlerConfig {
	onValidationError?: (ctx: IHttpContext, error: DomainException) => Response
	onNotFound?: (ctx: IHttpContext, error: DomainException) => Response
	onConflict?: (ctx: IHttpContext, error: DomainException) => Response
}

export function createExceptionMiddleware(config?: ExceptionHandlerConfig): Middleware {
	return async (ctx, next) => {
		try {
			return await next()
		} catch (error) {
			if (error instanceof DomainException) {
				// 根據狀態碼自訂處理
				if (error.statusCode === 422 && config?.onValidationError) {
					return config.onValidationError(ctx, error)
				}
				if (error.statusCode === 404 && config?.onNotFound) {
					return config.onNotFound(ctx, error)
				}
				if (error.statusCode === 409 && config?.onConflict) {
					return config.onConflict(ctx, error)
				}

				// 預設處理
				const response: ApiErrorResponse = {
					success: false,
					error: error.name,
					code: error.code,
					message: error.message,
					statusCode: error.statusCode,
				}

				return ctx.json(response, error.statusCode)
			}

			// 非 DomainException 錯誤
			const isProduction = process.env.APP_ENV === 'production'
			const response: ApiErrorResponse = {
				success: false,
				error: 'InternalServerError',
				message: isProduction ? '伺服器內部錯誤' : (error as Error).message,
				statusCode: 500,
			}

			return ctx.json(response, 500)
		}
	}
}
