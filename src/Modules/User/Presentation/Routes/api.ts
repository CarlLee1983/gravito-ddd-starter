/**
 * User Routes
 * 用戶模組的路由定義（框架無關）
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

/**
 * 註冊用戶路由
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
	router.get('/api/users', (ctx) => controller.index(ctx))

	/**
	 * GET /api/users/:id
	 * 獲取特定用戶
	 */
	router.get('/api/users/:id', (ctx) => controller.show(ctx))

	/**
	 * POST /api/users
	 * 創建新用戶
	 */
	router.post('/api/users', (ctx) => controller.store(ctx))
}
