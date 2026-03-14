/**
 * @file GravitoMiddlewareResolver.ts
 * @description Middleware 解析器的 Gravito 實現
 *
 * 職責：
 * - 透過 Gravito 容器懶解析 Middleware
 * - 若容器無該服務，安靜地返回 undefined（不拋出例外）
 * - 提供便利方法直接返回陣列，方便路由註冊使用
 */

import type { Middleware } from '@/Foundation/Presentation/IModuleRouter'
import type { IMiddlewareResolver } from '@/Foundation/Infrastructure/Wiring/IMiddlewareResolver'

export class GravitoMiddlewareResolver implements IMiddlewareResolver {
	constructor(private readonly container: { make(name: string): unknown }) {}

	resolve(name: string): Middleware | undefined {
		try {
			return this.container.make(name) as Middleware
		} catch {
			// Middleware 不可用時安靜返回 undefined
			return undefined
		}
	}

	resolveArray(name: string): Middleware[] {
		const middleware = this.resolve(name)
		return middleware ? [middleware] : []
	}
}
