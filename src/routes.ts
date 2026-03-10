/**
 * 根路由註冊 (Root Routes Registration)
 *
 * 集中註冊所有模組的 Presentation Layer 路由。
 * 所有模組透過接線層（wiring/index.ts）註冊，確保框架解耦：
 * - 框架特定邏輯（Gravito）集中在 src/adapters/
 * - 模組路由簽名統一使用 IModuleRouter
 * - 日後抽換框架時只需修改 wiring 層
 *
 * @param core - Gravito core instance
 */

import type { PlanetCore } from '@gravito/core'
import { registerHealth, registerUser } from './wiring'

/**
 * 註冊所有應用路由
 *
 * @param core - Gravito 核心實例
 */
export async function registerRoutes(core: PlanetCore) {
	// API root
	core.router.get('/api', async (ctx) => {
		return ctx.json({
			success: true,
			message: 'Welcome to Gravito DDD API',
			version: '1.0.0',
			endpoints: {
				health: '/health',
				healthHistory: '/health/history',
				users: '/api/users',
			},
		})
	})

	// 所有模組透過接線層統一註冊
	registerHealth(core)
	registerUser(core)

	console.log('✅ Routes registered')
}
