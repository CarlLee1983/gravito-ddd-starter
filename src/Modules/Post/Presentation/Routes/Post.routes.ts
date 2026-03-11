/**
 * @file Post.routes.ts
 * @description 定義 Post 模組的 API 路由與控制器的映射
 * @module src/Modules/Post/Presentation/Routes
 */

import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { PostController } from '../Controllers/PostController'

/**
 * 註冊 Post 路由
 * 
 * 在 DDD 架構中屬於「表現層 (Presentation Layer)」。
 * 此函數負責將 HTTP 路徑映射到控制器的對應方法。
 *
 * @param router - 框架無關的模組路由介面 (IModuleRouter)
 * @param controller - 已實例化並注入依賴的 PostController
 * @returns void
 */
export function registerPostRoutes(
	router: IModuleRouter,
	controller: PostController,
): void {
	/** 取得文章列表 */
	router.get('/api/Post', (ctx) => controller.index(ctx))
	/** 取得單一文章 */
	router.get('/api/Post/:id', (ctx) => controller.show(ctx))
	/** 建立新文章 */
	router.post('/api/Post', (ctx) => controller.store(ctx))
}
