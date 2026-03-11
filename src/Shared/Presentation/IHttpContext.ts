/**
 * IHttpContext - HTTP 上下文介面（框架無關）
 *
 * @module IHttpContext
 * @description
 * 控制器依賴此介面而非具體框架實作（GravitoContext）。
 * 允許未來更換框架或進行純 Mock 單元測試。
 *
 * **DDD 角色**
 * - 展示層：Presentation Port (Context)
 * - 職責：標準化 HTTP 請求與回應的操作介面。
 */

import type { GravitoContext } from '@gravito/core'

/**
 * HTTP 上下文介面
 */
export interface IHttpContext {
	/**
	 * 取得請求文字內容
	 *
	 * @returns {Promise<string>} 請求 Body 文字
	 */
	getBodyText(): Promise<string>

	/**
	 * 取得請求 JSON 內容
	 *
	 * @template T - 回傳資料類型
	 * @returns {Promise<T>} 請求 Body JSON 物件
	 */
	getJsonBody<T>(): Promise<T>

	/**
	 * 取得請求標頭值
	 *
	 * @param {string} name - Header 名稱
	 * @returns {string | undefined} Header 值
	 */
	getHeader(name: string): string | undefined

	/** 路由路徑參數 */
	params: Record<string, string | undefined>

	/** 查詢參數 (?key=value) */
	query: Record<string, string | undefined>

	/** 請求標頭集合 */
	headers: Record<string, string | undefined>

	/**
	 * 回傳 JSON 回應
	 *
	 * @template T - 資料類型
	 * @param {T} data - 要回傳的資料
	 * @param {number} [statusCode] - HTTP 狀態碼
	 * @returns {Response} HTTP 回應物件
	 */
	json<T>(data: T, statusCode?: number): Response

	/**
	 * 回傳文字回應
	 *
	 * @param {string} content - 要回傳的文字
	 * @param {number} [statusCode] - HTTP 狀態碼
	 * @returns {Response} HTTP 回應物件
	 */
	text(content: string, statusCode?: number): Response

	/**
	 * 回傳重新導向回應
	 *
	 * @param {string} url - 導向網址
	 * @param {number} [statusCode=302] - HTTP 狀態碼
	 * @returns {Response} HTTP 回應物件
	 */
	redirect(url: string, statusCode?: number): Response

	/**
	 * 從 Context 取得暫存值
	 *
	 * @template T - 資料類型
	 * @param {string} key - 鍵值名稱
	 * @returns {T | undefined} 儲存的值
	 */
	get<T>(key: string): T | undefined

	/**
	 * 在 Context 設定暫存值
	 *
	 * @param {string} key - 鍵值名稱
	 * @param {unknown} value - 要儲存的值
	 * @returns {void}
	 */
	set(key: string, value: unknown): void
}

/**
 * 適配器函式：將 GravitoContext 適配為 IHttpContext
 *
 * @param {GravitoContext} ctx - Gravito 原始上下文
 * @returns {IHttpContext} 框架無關的上下文實作
 */
export function fromGravitoContext(ctx: GravitoContext): IHttpContext {
	// 解析查詢參數
	const query = (() => {
		try {
			const url = new URL(ctx.req.url)
			const result: Record<string, string | undefined> = {}
			url.searchParams.forEach((value, key) => {
				result[key] = value
			})
			return result
		} catch {
			return {}
		}
	})()

	// 提供 headers 存取（透過 Proxy）
	const headers = new Proxy({} as Record<string, string | undefined>, {
		get: (_, key: string) => ctx.req.header(key),
	})

	return {
		getBodyText: () => ctx.req.text(),
		getJsonBody: async <T>() => {
			const req = ctx.req as unknown as {
				json?: () => Promise<T>
				text: () => Promise<string>
			}
			if (typeof req.json === 'function') {
				return req.json()
			}
			return JSON.parse(await req.text()) as T
		},
		getHeader: (name) => ctx.req.header(name),
		params: ((ctx as unknown as { params?: Record<string, string | undefined> })
			.params ?? {}) as Record<string, string | undefined>,
		query,
		headers,
		json: (data, statusCode) => ctx.json(data, statusCode as any),
		text: (content, statusCode) => ctx.text(content, statusCode as any),
		redirect: (url, statusCode = 302) => ctx.redirect(url, statusCode as any),
		get: <T>(key: string) => ctx.get(key as any) as T | undefined,
		set: (key, value) => ctx.set(key as any, value),
	}
}
