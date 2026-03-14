/**
 * @file GravitoModuleRouter.ts
 * @description Gravito 框架路由適配器
 */

import type { PlanetCore } from '@gravito/core'
import { fromGravitoContext } from '@/Foundation/Infrastructure/Adapters/Gravito/GravitoHttpContextAdapter'
import type {
	IModuleRouter,
	RouteHandler,
	Middleware,
} from '@/Foundation/Presentation/IModuleRouter'

/**
 * 執行 middleware 管線（洋蔥模型）
 */
function runPipeline(
	middlewares: Middleware[],
	handler: RouteHandler,
): RouteHandler {
	return async (ctx) => {
		let index = -1
		const dispatch = async (i: number): Promise<Response> => {
			if (i <= index) {
				return Promise.reject(new Error('next() called multiple times'))
			}
			index = i
			if (i === middlewares.length) {
				return await handler(ctx)
			}
			return await middlewares[i](ctx, () => dispatch(i + 1))
		}
		return await dispatch(0)
	}
}

/**
 * 建立 Gravito 框架的 IModuleRouter 適配器實例
 */
export function createGravitoModuleRouter(
	core: PlanetCore,
	prefix = '',
): IModuleRouter {
	function register(method: 'get' | 'post' | 'put' | 'patch' | 'delete') {
		return (path: string, ...args: unknown[]) => {
			const fullPath = prefix + path
			const handler = args[args.length - 1] as RouteHandler
			const middlewares = args.length > 1 ? (args[0] as Middleware[]) : []
			const pipeline = runPipeline(middlewares, handler)

			// 直接在核心 app (Hono) 上註冊，確保路由即時生效
			const app = (core as any).app
			if (app && typeof app[method] === 'function') {
				app[method](fullPath, async (honoCtx: any) => {
					const adaptedCtx = fromGravitoContext(honoCtx)
					try {
						return await pipeline(adaptedCtx)
					} catch (e) {
						console.error(`[GravitoRouter] Error in ${method.toUpperCase()} ${fullPath}:`, e)
						throw e
					}
				})
			} else {
				core.router[method](fullPath, async (ctx: any) => {
					return await pipeline(fromGravitoContext(ctx))
				})
			}
		}
	}

	return {
		get: register('get') as IModuleRouter['get'],
		post: register('post') as IModuleRouter['post'],
		put: register('put') as IModuleRouter['put'],
		patch: register('patch') as IModuleRouter['patch'],
		delete: register('delete') as IModuleRouter['delete'],
		head: (path: string, handler: RouteHandler) => {
			const fullPath = prefix + path
			const app = (core as any).app
			app.get(fullPath, async (ctx: any) => await handler(fromGravitoContext(ctx)))
		},
		options: (path: string, handler: RouteHandler) => {
			const fullPath = prefix + path
			const app = (core as any).app
			app.options(fullPath, async (ctx: any) => await handler(fromGravitoContext(ctx)))
		},
		group(groupPrefix, fn) {
			fn(createGravitoModuleRouter(core, prefix + groupPrefix))
		},
	}
}
