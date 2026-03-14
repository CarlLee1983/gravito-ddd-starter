/**
 * @file IMiddlewareResolver.ts
 * @description Middleware 解析器介面 - 用於懶取（Lazy Resolve）所需 Middleware
 *
 * 職責：
 * - 按名稱解析 Middleware（例如：'pageGuardMiddleware'、'adminGuardMiddleware'）
 * - 若 Middleware 不可用，返回 undefined（無拋出例外）
 * - 支持直接取得 middleware 陣列，方便路由註冊使用
 */

import type { Middleware } from '@/Foundation/Presentation/IModuleRouter'

export interface IMiddlewareResolver {
	/**
	 * 按名稱解析 Middleware
	 *
	 * @param name - Middleware 名稱（例如 'pageGuardMiddleware'）
	 * @returns Middleware 實例，若不可用返回 undefined
	 */
	resolve(name: string): Middleware | undefined

	/**
	 * 按名稱解析 Middleware 並返回陣列（直接用於路由註冊）
	 *
	 * @param name - Middleware 名稱（例如 'pageGuardMiddleware'）
	 * @returns 包含 Middleware 的陣列，若不可用返回空陣列
	 *
	 * @example
	 * router.get('/dashboard', middlewareResolver?.resolveArray('pageGuardMiddleware') ?? [], handler)
	 */
	resolveArray(name: string): Middleware[]
}
