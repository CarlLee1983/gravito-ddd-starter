/**
 * @file ModuleDefinition.ts
 * @description 模組定義介面 - 用於自動化裝配 (Auto-Wiring)
 *
 * 在 DDD 架構中的角色：
 * - 框架層 (Framework Layer)：定義模組如何與核心系統對接的契約。
 * - 職責：規定每個獨立模組必須提供的組裝資訊，包括 DI 註冊、倉庫註冊與路由裝配。
 */

import type { IDatabaseAccess } from '../IDatabaseAccess'
import type { ModuleServiceProvider } from '../IServiceProvider'
import type { IEventDispatcher } from '../IEventDispatcher'
import type { IModuleRouter } from '../../Presentation/IModuleRouter'

/**
 * 路由註冊用 Context（框架無關）
 * 模組內不應依賴 @gravito/core，改由此介面取得容器與路由器。
 */
export interface IRouteRegistrationContext {
	/** 從 DI 解析服務（僅需 make，框架無關） */
	container: { make(name: string): unknown }
	/** 建立模組用路由實例 */
	createModuleRouter(): IModuleRouter
}

/**
 * 模組定義介面
 * 每個模組的入口點 (index.ts) 必須導出一個符合此介面的物件
 */
export interface IModuleDefinition {
	/** 模組名稱 (用於日誌與診斷) */
	name: string

	/** 服務提供者類別 (用於註冊依賴注入) */
	provider: new () => ModuleServiceProvider

	/**
	 * 倉庫註冊函式 (選填)
	 * 若模組有持久化需求，在此註冊 Repository 工廠
	 *
	 * @param db - 已選定的資料庫適配器 (Atlas/Drizzle/Memory)
	 * @param eventDispatcher - 選填的領域事件分發器
	 */
	registerRepositories?: (db: IDatabaseAccess, eventDispatcher?: IEventDispatcher) => void

	/**
	 * 路由與表現層註冊函式 (選填)
	 * 用於裝配 Controller 並在框架中註冊路由（僅依賴 IRouteRegistrationContext，不依賴具體框架）
	 *
	 * @param ctx - 框架無關的註冊用 Context（容器 + 建立路由器）
	 */
	registerRoutes?: (ctx: IRouteRegistrationContext) => void
}
