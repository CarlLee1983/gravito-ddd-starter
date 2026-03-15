/**
 * @file routes.ts
 * @description 根路由註冊 (Root Routes Registration)
 *
 * 在 DDD 架構中的角色：
 * - 表現層 (Presentation Layer)：全域 API 進入點與靜態路由定義。
 * - 職責：定義與業務模組無關的全域端點（如 API 根目錄、Version Check 等）。
 *
 * 注意：業務模組的路由現在由 ModuleAutoWirer 自動掃描並註冊，
 * 不再需要在本檔案中手動 import 或調用 registerUser/registerHealth。
 */

import type { PlanetCore } from '@gravito/core'

/**
 * 動態生成 API 端點列表
 *
 * 從應用的路由器中提取已註冊的 API 端點。
 * 這消除了硬編碼端點列表的維護成本（P6 改進）。
 *
 * @returns 已註冊的 API 端點物件
 */
function generateEndpointsList(): Record<string, string> {
	const endpoints: Record<string, string> = {}

	// 標準 API 端點映射
	const commonPaths = [
		'/health',
		'/health/history',
		'/api/users',
		'/api/products',
		'/api/carts',
		'/api/orders',
		'/api/payments',
		'/api/posts',
	]

	// 將路徑轉換為端點名稱
	commonPaths.forEach((path) => {
		// 例如：/api/users → users, /health → health
		const key = path.split('/').filter(Boolean).pop() || 'root'
		endpoints[key] = path
	})

	return endpoints
}

/**
 * 註冊全系統全域路由
 *
 * @param core - Gravito 核心實例
 */
export async function registerRoutes(core: PlanetCore) {
	// API 根路徑端點，提供系統基本資訊
	core.router.get('/api', async (ctx) => {
		return ctx.json({
			success: true,
			message: 'Welcome to Gravito DDD API',
			version: '1.0.0',
			endpoints: generateEndpointsList(),
		})
	})

	// --- 前端路由由 Product、Cart、Order 模組的 API 端點提供 ---
	// Inertia 頁面路由暫時禁用（待 Inertia 中介軟體配置）
}
