/**
 * PostRoutes
 * Post 模組的路由定義（框架無關）
 *
 * 路由層只負責：
 * 1. 接收已組裝的 controller（依賴注入已完成）
 * 2. 接收框架無關的 IModuleRouter（適配層在 wiring 層完成）
 * 3. 定義路由與 controller 方法的映射
 */

import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { PostController } from '../Controllers/PostController'

/**
 * 註冊 Post 路由
 *
 * @param router - 框架無關的模組路由介面
 * @param controller - 已組裝的控制器實例（依賴已注入）
 */
export function registerPostRoutes(
	router: IModuleRouter,
	controller: PostController,
): void {
	router.get('/api/Post', (ctx) => controller.index(ctx))
	router.get('/api/Post/:id', (ctx) => controller.show(ctx))
	router.post('/api/Post', (ctx) => controller.store(ctx))
}
