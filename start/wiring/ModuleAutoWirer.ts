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
import { createGravitoServiceProvider } from '@/Shared/Infrastructure/Adapters/Gravito/GravitoServiceProviderAdapter'
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
		const modulesFound: string[] = []

		// 2. 獲取絕對路徑列表並逐一導入
		for (const file of files) {
			const absolutePath = path.resolve(process.cwd(), file)

			try {
				// 動態導入模組入口
				const moduleExports = await import(absolutePath)

				// 尋找導出的 Module 物件 (約定：變數名中包含 Module 且符合介面結構)
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

				// 3. 執行三步裝配流程：

				// 第一步：註冊 Service Provider 到 DI 容器 (先註冊才能在之後解析)
				const provider = new moduleDef.provider()
				core.register(createGravitoServiceProvider(provider))

				// 第二步：註冊 Repository 工廠 (Infrastructure Layer)
				if (moduleDef.registerRepositories) {
					// 直接注入 db 與傳入的 eventDispatcher
					console.log(`[AutoWirer] 呼叫 ${moduleDef.name}.registerRepositories()，eventDispatcher: ${eventDispatcher ? '✅' : '❌'}`)
					moduleDef.registerRepositories(db, eventDispatcher)
				}

				// 第三步：裝配 Presentation 層 (Controllers & Routes)，傳入框架無關的 Context
				if (moduleDef.registerRoutes) {
					const routeCtx: IRouteRegistrationContext = {
						container: core.container,
						createModuleRouter: () => createGravitoModuleRouter(core),
						createAuthRouter: () => {
							// 嘗試從容器取得 ITokenValidator 實現
							try {
								const tokenValidator = core.container.make(
									'tokenValidator'
								) as ITokenValidator
								return createGravitoAuthRouter(core, tokenValidator)
							} catch {
								// 若未註冊 tokenValidator，拋出清晰的錯誤訊息
								throw new Error('ITokenValidator 未實現，無法創建 Auth Router（確保 Session 模組已裝配並正確實現 ITokenValidator）')
							}
						},
					}
					moduleDef.registerRoutes(routeCtx)
				}

				modulesFound.push(moduleDef.name)
			} catch (error) {
				console.error(`❌ [AutoWirer] 裝配模組 ${file} 時發生錯誤:`, error)
			}
		}

		console.log(`╔════════════════════════════════════╗
║      Module Auto-Wiring Report     ║
╠════════════════════════════════════╣
║ Staged Modules: ${modulesFound.length.toString().padEnd(19)} ║
║ Active List: ${modulesFound.join(', ').padEnd(23)} ║
╚════════════════════════════════════╝`)
	}
}
