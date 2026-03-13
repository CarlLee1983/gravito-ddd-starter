/**
 * @file api.ts
 * @description 用戶模組路由定義 (框架無關)
 *
 * 在 DDD 架構中的角色：
 * - 表現層 (Presentation Layer)：定義外部進入模組的端點。
 * - 職責：將特定路徑映射到控制器的方法上。
 *
 * 路由層只負責：
 * 1. 接收已組裝的 controller（依賴注入已完成）
 * 2. 接收框架無關的 IModuleRouter（適配層在 wiring 層完成）
 * 3. 定義路由與 controller 方法的映射
 *
 * 好處：
 * - Routes 不依賴任何框架（不知道 GravitoContext）
 * - Routes 不知道依賴注入容器
 * - 可輕鬆抽換框架（只需修改 wiring 層）
 */

import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { UserController } from '../Controllers/UserController'
import { exceptionHandlingMiddleware } from '@/Shared/Presentation/Middlewares/ExceptionHandlingMiddleware'

/**
 * 註冊用戶模組的所有路由
 *
 * @param router - 框架無關的模組路由介面
 * @param controller - 已組裝的控制器實例（依賴已注入）
 */
export function registerUserRoutes(
	router: IModuleRouter,
	controller: UserController,
): void {
	/**
	 * GET /api/users
	 * 列出所有用戶
	 */
	router.get('/api/users', [exceptionHandlingMiddleware], (ctx) => controller.index(ctx))

	/**
	 * GET /api/users/:id
	 * 獲取特定用戶
	 */
	router.get('/api/users/:id', [exceptionHandlingMiddleware], (ctx) => controller.show(ctx))

	/**
	 * POST /api/users
	 * 創建新用戶
	 * 可能拋出 DuplicateEntityException（電子郵件已使用）
	 */
	router.post('/api/users', [exceptionHandlingMiddleware], (ctx) => controller.store(ctx))
}
