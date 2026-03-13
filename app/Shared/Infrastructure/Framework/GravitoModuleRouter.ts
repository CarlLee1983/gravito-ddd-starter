/**
 * @file GravitoModuleRouter.ts
 * @description Gravito 框架路由適配器
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：實作 IModuleRouter 介面。
 * - 職責：將核心系統定義的模組路由協定適配到 Gravito Web 框架的路由器上，並處理 Middleware 的管線化執行。
 */

import type { PlanetCore } from '@gravito/core'
import { fromGravitoContext } from '@/Shared/Infrastructure/Framework/GravitoHttpContextAdapter'
import type {
	IModuleRouter,
	RouteHandler,
	Middleware,
} from '@/Shared/Presentation/IModuleRouter'

/**
 * 執行 middleware 管線（洋蔥模型）
 * Middleware 按順序執行，最後執行核心 handler。
 *
 * @param middlewares - 中間件陣列
 * @param handler - 最終處理函式
 * @returns 適配後的 RouteHandler
 * @private
 */
function runPipeline(
	middlewares: Middleware[],
	handler: RouteHandler,
): RouteHandler {
	return (ctx) => {
		let index = -1
		const dispatch = (i: number): Promise<Response> => {
			if (i <= index) {
				return Promise.reject(new Error('next() called multiple times'))
			}
			index = i
			if (i === middlewares.length) {
				return handler(ctx)
			}
			return middlewares[i](ctx, () => dispatch(i + 1))
		}
		return dispatch(0)
	}
}

/**
 * 建立 Gravito 框架的 IModuleRouter 適配器實例
 *
 * @param core - Gravito 核心 PlanetCore 實例
 * @param prefix - 路由路徑前綴 (用於 group 遞迴調用，預設為空)
 * @returns 實作 IModuleRouter 介面的物件
 *
 * @example
 * const router = createGravitoModuleRouter(core)
 * router.get('/users', async (ctx) => ctx.json({ users: [] }))
 */
export function createGravitoModuleRouter(
	core: PlanetCore,
	prefix = '',
): IModuleRouter {
	/** 內部輔助函數：註冊 HTTP 方法 */
	function register(method: 'get' | 'post' | 'put' | 'patch' | 'delete') {
		return (path: string, ...args: unknown[]) => {
			const fullPath = prefix + path
			const handler = args[args.length - 1] as RouteHandler
			const middlewares = args.length > 1 ? (args[0] as Middleware[]) : []
			const pipeline = runPipeline(middlewares, handler)

			core.router[method](fullPath, (ctx: any) =>
				pipeline(fromGravitoContext(ctx)),
			)
		}
	}

	return {
		get: register('get') as IModuleRouter['get'],
		post: register('post') as IModuleRouter['post'],
		put: register('put') as IModuleRouter['put'],
		patch: register('patch') as IModuleRouter['patch'],
		delete: register('delete') as IModuleRouter['delete'],
		/** HEAD 請求實作 (通常以 GET 代替) */
		head: (path: string, handler: RouteHandler) => {
			const fullPath = prefix + path
			core.router.get(fullPath, (ctx: any) => handler(fromGravitoContext(ctx)))
		},
		/** OPTIONS 請求實作 (提供備用機制) */
		options: (path: string, handler: RouteHandler) => {
			const fullPath = prefix + path
			const router = core.router as any
			if (router.options && typeof router.options === 'function') {
				router.options(fullPath, (ctx: any) => handler(fromGravitoContext(ctx)))
			} else {
				router.get(fullPath, (ctx: any) => handler(fromGravitoContext(ctx)))
			}
		},
		/** 路由分組實作，支援巢狀路徑與前綴 */
		group(groupPrefix, fn) {
			fn(createGravitoModuleRouter(core, prefix + groupPrefix))
		},
	}
}
