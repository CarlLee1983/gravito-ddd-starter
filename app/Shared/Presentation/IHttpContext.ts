/**
 * IHttpContext - HTTP 上下文介面（框架無關）
 */

import type { GravitoContext } from '@gravito/core'

/**
 * HTTP 上下文介面
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

/**
 * 適配器函式：將 GravitoContext 適配為 IHttpContext
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

	// 解析路由參數
	const params = (() => {
		try {
			if (ctx.req.params && typeof ctx.req.params === 'function') {
				return ctx.req.params() ?? {}
			}
			return (ctx.req as any).params ?? {}
		} catch (err) {
			console.error('[IHttpContext] Error extracting params:', err)
			return {}
		}
	})()

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
		params,
		query,
		headers,
		json: (data, statusCode) => ctx.json(data, statusCode as any),
		text: (content, statusCode) => ctx.text(content, statusCode as any),
		redirect: (url, statusCode = 302) => ctx.redirect(url, statusCode as any),
		get: <T>(key: string) => ctx.get(key as any) as T | undefined,
		set: (key, value) => ctx.set(key as any, value),

		/**
		 * 實作 Inertia 協議
		 */
		render(component, props = {}) {
			const isInertia = ctx.req.header('X-Inertia') === 'true'
			const url = new URL(ctx.req.url).pathname

			const page = {
				component,
				props,
				url,
				version: process.env.VITE_ASSET_VERSION || '1.0.0'
			}

			if (isInertia) {
				// 若是 Inertia 發起的請求，回傳 JSON
				return ctx.json(page, {
					headers: { 'X-Inertia': 'true' }
				} as any)
			}

			// 否則回傳基礎 HTML 容器 (開發環境指向 Vite HMR)
			const isDev = process.env.APP_ENV !== 'production'
			const viteClient = isDev ? '<script type="module" src="http://localhost:5173/@vite/client"></script>' : ''
			const viteEntry = isDev 
				? '<script type="module" src="http://localhost:5173/resources/js/app.tsx"></script>'
				: '<script type="module" src="/dist/public/app.js"></script>'

			const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gravito DDD Dashboard</title>
    ${viteClient}
    ${viteEntry}
</head>
<body class="bg-gray-50">
    <div id="app" data-page='${JSON.stringify(page)}'></div>
</body>
</html>
			`.trim()

			return ctx.text(html, {
				headers: { 'Content-Type': 'text/html' }
			} as any)
		}
	}
}
