/**
 * @file routes.ts
 * @description 根路由註冊 (Root Routes Registration)
 *
 * 在 DDD 架構中的角色：
 * - 表現層 (Presentation Layer)：應用程式的全域路由配置中心。
 * - 職責：集中註冊所有模組的表現層路由，並將其適配到特定的 Web 框架（如 Gravito）上。
 *
 * 設計原則：
 * - 集中註冊所有模組的 Presentation Layer 路由。
 * - 所有模組透過接線層（wiring/index.ts）註冊，確保框架解耦：
 * - 框架特定邏輯（Gravito）集中在 src/adapters/
 * - 模組路由簽名統一使用 IModuleRouter
 * - 日後抽換框架時只需修改 wiring 層
 */

import type { PlanetCore } from '@gravito/core'
import { registerHealth, registerUser } from './wiring'

/**
 * 註冊全系統應用路由
 *
 * @param core - Gravito 核心實例，提供路由器存取功能
 * @returns 非同步作業
 */
export async function registerRoutes(core: PlanetCore) {
	// API 根路徑端點，提供系統基本資訊
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

	// 所有業務模組透過接線層 (Wiring Layer) 統一註冊，保持框架無關性
	registerHealth(core)
	registerUser(core)

	console.log('✅ Routes registered')
}
