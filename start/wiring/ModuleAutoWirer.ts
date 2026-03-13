/**
 * @file ModuleAutoWirer.ts
 * @description Module Auto-Wiring Mechanism
 * 
 * Role: Wiring Layer
 */

import path from 'node:path'
import { glob } from 'glob'
import type { PlanetCore } from '@gravito/core'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/Ports/Database/IDatabaseAccess'
import { createGravitoServiceProvider, GravitoContainerAdapter } from '@/Shared/Infrastructure/Adapters/Gravito/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Adapters/Gravito/GravitoModuleRouter'
import { createGravitoAuthRouter } from '@/Shared/Infrastructure/Adapters/Gravito/GravitoAuthRouter'
import type {
	IModuleDefinition,
	IRouteRegistrationContext,
} from '@/Shared/Infrastructure/Wiring/ModuleDefinition'
import type { ITokenValidator } from '@/Shared/Infrastructure/Ports/Auth/ITokenValidator'

/**
 * 模組自動裝配器類別
 */
export class ModuleAutoWirer {
	/**
	 * 自動掃描並裝配所有模組
	 *
	 * @param core - Gravito 核心實例
	 * @param db - 由 DatabaseAccessBuilder 選定的資料庫適配器實例
	 * @param eventDispatcher - 全域事件分派器實例
	 * @returns {Promise<void>} 裝配完成
	 */
	static async wire(core: PlanetCore, db: IDatabaseAccess, eventDispatcher: any): Promise<void> {
		// 1. 定義掃描模式：所有模組目錄下的 index.ts
		const files = await glob('app/Modules/*/index.ts')
		const modulesFound: { def: IModuleDefinition, file: string }[] = []

		// 2. 獲取絕對路徑列表並逐一導入
		for (const file of files) {
			const absolutePath = path.resolve(process.cwd(), file)

			try {
				// 動態導入模組入口
				const moduleExports = await import(absolutePath)

				// 尋找導出的 Module 物件
				const moduleDef = Object.values(moduleExports).find(
					(v: any) =>
						v &&
						typeof v === 'object' &&
						'name' in v &&
						'provider' in v
				) as IModuleDefinition

				if (!moduleDef) {
					console.warn(`⚠️ [AutoWirer] 忽略檔案 ${file}: 未找到正確的 IModuleDefinition 導出`)
					continue
				}

				modulesFound.push({ def: moduleDef, file })
			} catch (error) {
				console.error(`❌ [AutoWirer] 載入模組 ${file} 時發生錯誤:`, error)
			}
		}

		// 3. 執行裝配流程 (分階段確保依賴關係正確)

		// 第一階段：手動執行所有 Service Provider 的 register 方法
		// 這是為了確保在第三階段註冊路由時，所有依賴都已經在容器中可用
		const adaptedContainer = new GravitoContainerAdapter(core.container as any)
		for (const { def } of modulesFound) {
			const provider = new def.provider()
			// 1. 先執行內部註冊
			provider.register(adaptedContainer)
			// 2. 再掛載到 Gravito 框架生命週期 (用於執行 boot)
			core.register(createGravitoServiceProvider(provider))
		}

		// 第二階段：註冊所有 Repository 工廠 (Infrastructure Layer)
		for (const { def } of modulesFound) {
			if (def.registerRepositories) {
				def.registerRepositories(db, eventDispatcher)
			}
		}

		// 第三階段：裝配 Presentation 層 (需要服務和 Repository 都已註冊)
		const activeModules: string[] = []

		// 先嘗試獲取 pageGuardMiddleware（用於所有模組）
		let pageGuardMiddleware: any = undefined
		try {
			pageGuardMiddleware = core.container.make('pageGuardMiddleware')
		} catch {
			console.warn('[AutoWirer] ⚠️ pageGuardMiddleware not available, page authentication may not work')
		}

		for (const { def, file } of modulesFound) {
			if (def.registerRoutes) {
				try {
					console.log(`[AutoWirer] 🔄 Wiring routes for module: ${def.name}...`)
					const routeCtx: IRouteRegistrationContext = {
						container: core.container,
						createModuleRouter: () => {
							console.log(`[AutoWirer] 📍 Creating router for module: ${def.name}`)
							return createGravitoModuleRouter(core)
						},
						createAuthRouter: () => {
							try {
								const tokenValidator = core.container.make(
									'tokenValidator'
								) as ITokenValidator
								return createGravitoAuthRouter(core, tokenValidator)
							} catch {
								throw new Error(`ITokenValidator 未實現，無法為模組 ${def.name} 建立 Auth Router`)
							}
						},
						pageGuardMiddleware,
					}
					def.registerRoutes(routeCtx)
					console.log(`[AutoWirer] ✅ Routes wired successfully for module: ${def.name}`)
					activeModules.push(def.name)
				} catch (error) {
					console.error(`❌ [AutoWirer] 裝配模組 ${file} 路由時發生錯誤:`, error)
				}
			} else {
				activeModules.push(def.name)
			}
		}

		console.log(`╔════════════════════════════════════╗
║      Module Auto-Wiring Report     ║
╠════════════════════════════════════╣
║ Staged Modules: ${activeModules.length.toString().padEnd(19)} ║
║ Active List: ${activeModules.join(', ').padEnd(23)} ║
╚════════════════════════════════════╝`)
	}
}
