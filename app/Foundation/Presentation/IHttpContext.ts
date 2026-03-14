/**
 * @file IHttpContext.ts
 * @description HTTP 上下文介面（框架無關）
 *
 * 此檔案定義純粹的 Port 介面，不依賴任何特定框架。
 * 具體的框架適配器（如 Gravito）應在獨立的 Adapter 檔案中實作。
 *
 * @see Shared/Infrastructure/Framework/GravitoHttpContextAdapter.ts - Gravito 適配器
 */

/**
 * HTTP 上下文介面 (Port)
 *
 * 定義應用層與 HTTP 框架的邊界。
 * 實現者應適配特定框架（Gravito、Express、Hono 等）。
 */
export interface IHttpContext {
	/** 取得請求文字內容 */
	getBodyText(): Promise<string>

	/** 取得請求 JSON 內容 */
	getJsonBody<T>(): Promise<T>

	/** 取得請求標頭值 */
	getHeader(name: string): string | undefined

	/** 路由路徑參數 */
	params: Record<string, string | undefined>

	/** 查詢參數 (?key=value) */
	query: Record<string, string | undefined>

	/** 請求標頭集合 */
	headers: Record<string, string | undefined>

	/** 回傳 JSON 回應 */
	json<T>(data: T, statusCode?: number): Response

	/** 回傳文字回應 */
	text(content: string, statusCode?: number): Response

	/** 回傳重新導向回應 */
	redirect(url: string, statusCode?: number): Response

	/** 從 Context 取得暫存值 */
	get<T>(key: string): T | undefined

	/** 在 Context 設定暫存值 */
	set(key: string, value: unknown): void

	/**
	 * 渲染前端頁面 (Inertia.js 橋接)
	 *
	 * @param component - 前端組件路徑 (相對於 resources/js/Pages)
	 * @param props - 傳遞給組件的資料
	 */
	render(component: string, props?: Record<string, any>): Response
}
