/**
 * Health 模組註冊適配器（Gravito 實現）
 *
 * 負責處理框架特定的邏輯，然後調用框架無關的路由註冊函式
 */

import type { PlanetCore } from '@gravito/core'
import { fromGravitoContext } from '@/Shared/Presentation/IHttpContext'
import { createGravitoModuleRouter } from './GravitoModuleRouter'
import { registerHealthRoutes } from '@/Modules/Health/Presentation/Routes/health.routes'
import { HealthController } from '@/Modules/Health/Presentation/Controllers/HealthController'

/**
 * 註冊 Health 模組與 Gravito 框架的整合
 *
 * 此適配器完成以下工作：
 * 1. 從 Gravito core 取得所需服務
 * 2. 創建框架無關的路由適配器
 * 3. 實例化控制器（注入依賴）
 * 4. 調用框架無關的路由註冊函式
 */
export function registerHealthWithGravito(core: PlanetCore): void {
	const router = createGravitoModuleRouter(core)

	// 從容器中獲取應用服務
	const service = core.container.make('healthCheckService') as any

	// Gravito 中的資源需要通過 middleware 或其他機制訪問
	// 我們將其作為控制器的可選參數，在實際調用時通過 context 注入
	const controller = new HealthController(service)

	// 註冊路由
	registerHealthRoutes(router, controller)
}
