/**
 * @file index.ts
 * @description Inventory 模組入口點
 *
 * 負責模組的註冊、初始化和路由設置。
 */

import type { IModuleDefinition } from '@/Foundation/Infrastructure/Wiring/IModuleDefinition'
import type { IGravitoCore } from '@/Foundation/Infrastructure/Ports/Core/IGravitoCore'
import { MemoryInventoryRepository } from './Infrastructure/Repositories/MemoryInventoryRepository'
import { AtlasInventoryRepository } from './Infrastructure/Repositories/AtlasInventoryRepository'
import { DrizzleInventoryRepository } from './Infrastructure/Repositories/DrizzleInventoryRepository'

/**
 * Inventory 模組定義
 */
export const inventoryModule: IModuleDefinition = {
	name: 'Inventory',
	description: '庫存管理模組 - 處理商品庫存預留與扣減',

	/**
	 * 在 DI 容器中註冊 Repository
	 *
	 * @param core - Gravito Core 實例
	 */
	async registerRepositories(core: IGravitoCore): Promise<void> {
		const container = core.container
		const db = container.make('database')
		const eventDispatcher = container.make('eventDispatcher')

		// 根據環境註冊相應的 Repository 實現
		const ormAdapter = process.env.ORM_ADAPTER || 'memory'

		container.singleton('inventoryRepository', () => {
			switch (ormAdapter) {
				case 'atlas':
					return new AtlasInventoryRepository(db, eventDispatcher)
				case 'drizzle':
					return new DrizzleInventoryRepository(db, eventDispatcher)
				case 'memory':
				default:
					return new MemoryInventoryRepository()
			}
		})
	},

	/**
	 * 在 HTTP 路由中註冊 Inventory 端點
	 *
	 * @param core - Gravito Core 實例
	 */
	async registerRoutes(core: IGravitoCore): Promise<void> {
		// 路由註冊待 Presentation 層補充
		// const router = core.router
		// const inventoryController = core.container.make('inventoryController')
		// router.get('/inventories', ...)
		// router.get('/inventories/:id', ...)
		// router.post('/inventories/:id/reserve', ...)
		// router.post('/inventories/:id/deduct', ...)
		// router.post('/inventories/:id/release', ...)
	},
}

// 導出 Domain 層組件供其他模組使用
export { InventoryAggregate } from './Domain/Aggregates/InventoryAggregate'
export { SKU } from './Domain/ValueObjects/SKU'
export { InventoryReserved } from './Domain/Events/InventoryReserved'
export { InventoryDeducted } from './Domain/Events/InventoryDeducted'
export { InventoryReleased } from './Domain/Events/InventoryReleased'
export type { IInventoryRepository } from './Domain/Repositories/IInventoryRepository'

// 導出 Application 層組件
export { ReserveInventoryService, type ReserveInventoryRequest, type ReserveInventoryResponse } from './Application/Services/ReserveInventoryService'
export { DeductInventoryService, type DeductInventoryRequest, type DeductInventoryResponse } from './Application/Services/DeductInventoryService'

// 導出 Infrastructure 層組件（Repository 實現）
export { MemoryInventoryRepository } from './Infrastructure/Repositories/MemoryInventoryRepository'
export { AtlasInventoryRepository } from './Infrastructure/Repositories/AtlasInventoryRepository'
export { DrizzleInventoryRepository } from './Infrastructure/Repositories/DrizzleInventoryRepository'
export { InventoryCommandAdapter } from './Infrastructure/Adapters/InventoryCommandAdapter'
