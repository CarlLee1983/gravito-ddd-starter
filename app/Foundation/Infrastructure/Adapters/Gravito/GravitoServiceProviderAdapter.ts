/**
 * @file GravitoServiceProviderAdapter.ts
 * @description Gravito 服務提供者適配器
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：作為領域模組啟動與 Gravito 框架生命週期之間的橋樑。
 * - 職責：將框架無關的 ModuleServiceProvider 適配為 Gravito 識別的 ServiceProvider，並封裝容器轉換邏輯。
 *
 * 這是框架耦合的唯一地點。
 */

import { ServiceProvider, type Container as GravitoContainer, type PlanetCore } from '@gravito/core'
import type { ModuleServiceProvider, IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'

/**
 * 容器適配器類別
 * 將 Gravito 的原生 Container 適配為框架無關的 IContainer 介面。
 */
export class GravitoContainerAdapter implements IContainer {
	/**
	 * 建構子
	 * @param gravitoContainer - Gravito 原生容器實例
	 */
	constructor(private gravitoContainer: GravitoContainer) {}

	/**
	 * 註冊一個單例服務
	 * @param name - 服務名稱
	 * @param factory - 實例建立工廠
	 */
	singleton(name: string, factory: (container: IContainer) => any): void {
		this.gravitoContainer.singleton(name, (c: GravitoContainer) => {
			return factory(new GravitoContainerAdapter(c))
		})
	}

	/**
	 * 註冊一個每次都建立新實例的服務
	 * @param name - 服務名稱
	 * @param factory - 實例建立工廠
	 */
	bind(name: string, factory: (container: IContainer) => any): void {
		// Gravito 中的 bind 實作每次都會呼叫工廠創建新實例
		this.gravitoContainer.bind(name, (c: GravitoContainer) => {
			return factory(new GravitoContainerAdapter(c))
		})
	}

	/**
	 * 解析並獲取指定的服務實例
	 * @param name - 服務名稱
	 * @returns 服務實例
	 */
	make(name: string): any {
		return this.gravitoContainer.make(name)
	}
}

/**
 * 服務提供者適配器類別
 * 將系統內部的模組啟動邏輯掛載至 Gravito 框架。
 */
export class GravitoServiceProviderAdapter extends ServiceProvider {
	/**
	 * 建構子
	 * @param moduleProvider - 內部定義的模組服務提供者
	 */
	constructor(private moduleProvider: ModuleServiceProvider) {
		super()
	}

	/**
	 * 向框架容器註冊服務
	 * @param container - Gravito 原生容器
	 */
	register(container: GravitoContainer): void {
		// 將 Gravito 的 Container 適配為框架無關的 IContainer
		const adaptedContainer = new GravitoContainerAdapter(container)

		// 調用模組的註冊方法
		this.moduleProvider.register(adaptedContainer)
	}

	/**
	 * 啟動模組邏輯
	 * @param core - PlanetCore 實例
	 */
	boot(core: PlanetCore): void {
		// 調用模組的啟動方法
		this.moduleProvider.boot(core)
	}
}

/**
 * 適配器建立工廠函式
 *
 * @param moduleProvider - 框架無關的模組服務提供者實例
 * @returns 回傳 Gravito 框架相容的 ServiceProvider 實例
 *
 * @example
 * app.register(createGravitoServiceProvider(new UserServiceProvider()))
 */
export function createGravitoServiceProvider(moduleProvider: ModuleServiceProvider): ServiceProvider {
	return new GravitoServiceProviderAdapter(moduleProvider)
}
