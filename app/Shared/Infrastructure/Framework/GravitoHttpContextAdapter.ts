/**
 * @file GravitoHttpContextAdapter.ts
 * @description Gravito 框架 HTTP 上下文適配器
 *
 * 將 GravitoContext 適配為 IHttpContext Port 介面。
 * 此適配器獨立於 Port 定義，可單獨替換或升級。
 *
 * 架構優勢：
 * - Port 介面 (IHttpContext) 保持框架無關
 * - Gravito 相關邏輯隔離在適配器中
 * - 若要支持其他框架，建立新的適配器即可
 *
 * @see Shared/Presentation/IHttpContext.ts - Port 介面定義
 */

import type { GravitoContext } from '@gravito/core'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/**
 * 將 Gravito 框架的 Context 適配為 IHttpContext 介面
 *
 * @param ctx - Gravito 的原生 Context 物件
 * @returns 符合 IHttpContext 介面的適配器物件
 * @public
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
			// 無法提取參數時回傳空物件
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
		 * 實作 Inertia.js 協議
		 *
		 * 支持兩種回應模式：
		 * 1. Inertia XHR: 回傳 JSON 格式的頁面資料
		 * 2. 首次載入: 回傳 HTML 容器，由前端初始化
		 */
		render(component, props = {}) {
			const isInertia = ctx.req.header('X-Inertia') === 'true'
			const url = new URL(ctx.req.url).pathname

			const page = {
				component,
				props,
				url,
				version: process.env.VITE_ASSET_VERSION || '1.0.0',
			}

			if (isInertia) {
				// Inertia XHR 請求：回傳 JSON
				return ctx.json(page, {
					headers: { 'X-Inertia': 'true' },
				} as any)
			}

			// 首次載入或傳統 HTTP 請求：回傳 HTML 容器
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
				headers: { 'Content-Type': 'text/html' },
			} as any)
		},
	}
}
