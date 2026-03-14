/**
 * 依賴注入容器與服務提供者介面
 *
 * @module IServiceProvider
 * @description
 * 定義依賴注入的註冊和解析機制，隱藏具體框架（Gravito/Nest/Express 等）的容器實現。
 *
 * **設計原則**
 * - 完全框架無關：不依賴任何具體 DI 框架。
 * - 支援兩種生命週期：單例（全應用共享）和工廠（每次新建）。
 * - 遵循依賴注入模式：所有服務通過容器解析。
 *
 * **DDD 角色**
 * - 基礎建設：Infrastructure Port (DI Container)
 * - 職責：管理組件的生命週期與依賴關係。
 */

/**
 * 依賴注入容器介面
 *
 * @public
 */
export interface IContainer {
	/**
	 * 註冊單例服務（全應用共享一個實例）
	 *
	 * 適用於：資料庫連接、Logger、Config 等重量級、無狀態的服務。
	 *
	 * @param {string} name - 服務註冊名稱
	 * @param {function(IContainer): any} factory - 工廠函數，接收容器，返回服務實例
	 * @returns {void}
	 */
	singleton(name: string, factory: (container: IContainer) => any): void

	/**
	 * 註冊工廠服務（每次解析創建新實例）
	 *
	 * 適用於：Request Handler、Controller 等有狀態的服務。
	 *
	 * @param {string} name - 服務註冊名稱
	 * @param {function(IContainer): any} factory - 工廠函數，每次調用 make() 都會執行
	 * @returns {void}
	 */
	bind(name: string, factory: (container: IContainer) => any): void

	/**
	 * 從容器解析服務
	 *
	 * @param {string} name - 服務註冊名稱
	 * @returns {any} 解析後的服務實例
	 * @throws 若服務未註冊，應拋出清晰的錯誤信息
	 */
	make(name: string): any
}

/**
 * 服務提供者抽象基底類別（框架無關）
 *
 * @abstract
 * @public - 所有 Module 都應該繼承此類定義服務提供者
 */
export abstract class ModuleServiceProvider {
	/**
	 * 註冊服務到容器
	 *
	 * 此方法在應用啟動時調用，模組在此定義所有提供的服務。
	 *
	 * @abstract
	 * @param {IContainer} container - 框架無關的容器介面
	 * @returns {void}
	 */
	abstract register(container: IContainer): void

	/**
	 * 啟動服務（可選）
	 *
	 * 在應用啟動完成後調用，用於執行初始化邏輯（如建立資料庫索引、預熱快取等）。
	 *
	 * @param {any} [_context] - 應用上下文（框架特定，Module 不應該強依賴它）
	 * @returns {void}
	 */
	boot(_context: any): void {
		// 預設空實現
	}
}
