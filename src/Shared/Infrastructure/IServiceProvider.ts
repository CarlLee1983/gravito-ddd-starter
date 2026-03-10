/**
 * IServiceProvider - 框架無關的服務提供者介面
 *
 * 定義依賴注入容器的註冊和啟動流程，
 * 不依賴任何具體框架實現。
 */

export interface IContainer {
	/** 註冊單例服務（全應用共享一個實例） */
	singleton(name: string, factory: (container: IContainer) => any): void

	/** 註冊工廠服務（每次解析創建新實例） */
	bind(name: string, factory: (container: IContainer) => any): void

	/** 從容器解析服務 */
	make(name: string): any
}

/**
 * 服務提供者基類（框架無關）
 *
 * 模組應繼承此類而不是直接繼承框架特定的 ServiceProvider。
 * 由框架適配層負責將此類適配為具體框架的 ServiceProvider。
 */
export abstract class ModuleServiceProvider {
	/**
	 * 註冊服務到容器
	 *
	 * @param container - 框架無關的容器介面
	 */
	abstract register(container: IContainer): void

	/**
	 * 啟動服務（可選）
	 *
	 * 在應用啟動時調用，用於初始化邏輯。
	 * 注意：此時需要框架特定的資源，應由適配層傳入。
	 *
	 * @param _context - 應用上下文（框架特定）
	 */
	boot(_context: any): void {
		// 默認空實現
	}
}
