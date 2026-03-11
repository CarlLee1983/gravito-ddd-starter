import type { IHttpContext } from './IHttpContext'

/**
 * 最終請求處理函式類型
 */
export type RouteHandler = (ctx: IHttpContext) => Promise<Response>

/**
 * 中間件函式類型 — 洋蔥模型（Onion Model）
 *
 * @param {IHttpContext} ctx - HTTP 上下文
 * @param {function(): Promise<Response>} next - 呼叫下一個中間件或處理器
 * @returns {Promise<Response>} HTTP 回應
 */
export type Middleware = (
	ctx: IHttpContext,
	next: () => Promise<Response>,
) => Promise<Response>

/**
 * 框架無關的模組路由介面
 *
 * @module IModuleRouter
 * @description
 * 定義模組路由註冊的標準介面。
 * 讓各模組 Presentation 層註冊路由時與具體框架解耦。
 *
 * **設計原則**
 * 1. 完整 HTTP 方法支援。
 * 2. 每個方法支援可選中間件陣列（洋蔥模型）。
 * 3. 路由群組 (group) 支援路徑前綴。
 *
 * **DDD 角色**
 * - 展示層：Presentation Port (Router)
 * - 職責：解耦路由註冊邏輯。
 */
export interface IModuleRouter {
	/**
	 * GET 請求註冊
	 * @param {string} path - 路由路徑
	 * @param {RouteHandler | Middleware[]} middlewaresOrHandler - 中間件陣列或處理器
	 * @param {RouteHandler} [handler] - 處理器（若提供中間件陣列）
	 */
	get(path: string, handler: RouteHandler): void
	get(path: string, middlewares: Middleware[], handler: RouteHandler): void

	/**
	 * POST 請求註冊
	 * @param {string} path - 路由路徑
	 * @param {RouteHandler | Middleware[]} middlewaresOrHandler - 中間件陣列或處理器
	 * @param {RouteHandler} [handler] - 處理器（若提供中間件陣列）
	 */
	post(path: string, handler: RouteHandler): void
	post(path: string, middlewares: Middleware[], handler: RouteHandler): void

	/**
	 * PUT 請求註冊
	 * @param {string} path - 路由路徑
	 * @param {RouteHandler | Middleware[]} middlewaresOrHandler - 中間件陣列或處理器
	 * @param {RouteHandler} [handler] - 處理器（若提供中間件陣列）
	 */
	put(path: string, handler: RouteHandler): void
	put(path: string, middlewares: Middleware[], handler: RouteHandler): void

	/**
	 * PATCH 請求註冊
	 * @param {string} path - 路由路徑
	 * @param {RouteHandler | Middleware[]} middlewaresOrHandler - 中間件陣列或處理器
	 * @param {RouteHandler} [handler] - 處理器（若提供中間件陣列）
	 */
	patch(path: string, handler: RouteHandler): void
	patch(path: string, middlewares: Middleware[], handler: RouteHandler): void

	/**
	 * DELETE 請求註冊
	 * @param {string} path - 路由路徑
	 * @param {RouteHandler | Middleware[]} middlewaresOrHandler - 中間件陣列或處理器
	 * @param {RouteHandler} [handler] - 處理器（若提供中間件陣列）
	 */
	delete(path: string, handler: RouteHandler): void
	delete(path: string, middlewares: Middleware[], handler: RouteHandler): void

	/**
	 * HEAD 請求註冊
	 * @param {string} path - 路由路徑
	 * @param {RouteHandler} handler - 處理器
	 */
	head(path: string, handler: RouteHandler): void

	/**
	 * OPTIONS 請求註冊
	 * @param {string} path - 路由路徑
	 * @param {RouteHandler} handler - 處理器
	 */
	options(path: string, handler: RouteHandler): void

	/**
	 * 路由群組 — 套用路徑前綴
	 *
	 * @param {string} prefix - 路徑前綴（如 '/api/v1'）
	 * @param {function(IModuleRouter): void} fn - 在此群組中定義路由的函式
	 */
	group(prefix: string, fn: (router: IModuleRouter) => void): void
}
