/**
 * @file ModuleAutoWirer.ts
 * @description Module Auto-Wiring Mechanism
 * 
 * Role: Wiring Layer
 */

import path from 'node:path'
import { glob } from 'glob'
import type { PlanetCore } from '@gravito/core'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { createGravitoServiceProvider } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IModuleDefinition } from '@/Shared/Infrastructure/Framework/ModuleDefinition'

/**
 * 模組自動裝配器類別
 */
export class ModuleAutoWirer {
	/**
	 * 自動掃描並裝配所有模組
	 *
	 * @param core - Gravito 核心實例
	 * @param db - 由 DatabaseAccessBuilder 選定的資料庫適配器實例
	 * @returns {Promise<void>} 裝配完成
	 */
	static async wire(core: PlanetCore, db: IDatabaseAccess): Promise<void> {
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
					// 嘗試從容器中獲取 eventDispatcher (若已註冊)
					let eventDispatcher: any = undefined
					try {
						eventDispatcher = core.container.make('eventDispatcher')
					} catch {
						// 忽略未註冊的情況
					}
					
					// 注入 db 與 eventDispatcher
					moduleDef.registerRepositories(db, eventDispatcher)
				}

				// 第三步：裝配 Presentation 層 (Controllers & Routes)
				if (moduleDef.registerRoutes) {
					moduleDef.registerRoutes(core)
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
