import type { Middleware, RouteHandler } from './IModuleRouter'

/**
 * 路由與中間件輔助工具
 *
 * @module routerHelpers
 */

/**
 * 合併多個中間件為單一中間件
 *
 * @param {...Middleware[]} middlewares - 要合併的中間件列表
 * @returns {Middleware} 合併後的中間件
 *
 * @example
 * const secured = compose(rateLimiter, jwtGuard, auditLog)
 * router.get('/admin/data', [secured], getAdminData)
 */
export function compose(...middlewares: Middleware[]): Middleware {
	return (ctx, next) => {
		let index = -1
		const dispatch = (i: number): Promise<Response> => {
			if (i <= index) {
				return Promise.reject(new Error('next() called multiple times'))
			}
			index = i
			if (i === middlewares.length) {
				return next()
			}
			return middlewares[i](ctx, () => dispatch(i + 1))
		}
		return dispatch(0)
	}
}

/**
 * 將中間件包裝為 RouteHandler 裝飾器
 *
 * @param {...Middleware[]} middlewares - 要套用的中間件
 * @returns {function(RouteHandler): RouteHandler} 裝飾器函式
 *
 * @example
 * const protectedHandler = withGuard(jwtGuard)(getProfile)
 * router.get('/users/me', protectedHandler)
 */
export function withGuard(
	...middlewares: Middleware[]
): (handler: RouteHandler) => RouteHandler {
	return (handler) => {
		const composed = compose(...middlewares)
		return (ctx) => composed(ctx, () => handler(ctx))
	}
}
