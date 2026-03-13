/**
 * @file GravitoHttpContextAdapter.ts
 * @description Gravito 框架 HTTP 上下文適配器
 */

import type { GravitoContext } from '@gravito/core'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/**
 * 將 Gravito 框架的 Context 適配為 IHttpContext 介面
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

	// 提供 headers 存取
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

		json: (data, statusCode = 200) => {
			// 使用原生 Response 確保 status 絕對正確
			return new Response(JSON.stringify(data), {
				status: statusCode,
				headers: { 'Content-Type': 'application/json' }
			}) as any
		},
		text: (content, statusCode = 200) => {
			return new Response(content, {
				status: statusCode,
				headers: { 'Content-Type': 'text/plain' }
			}) as any
		},
		redirect: (url, statusCode = 302) => {
			return new Response(null, {
				status: statusCode,
				headers: { 'Location': url }
			}) as any
		},
		get: <T>(key: string) => ctx.get(key as any) as T | undefined,
		set: (key, value) => ctx.set(key as any, value),

		/**
		 * 實作 Inertia.js 協議
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
				return new Response(JSON.stringify(page), {
					status: 200,
					headers: { 
						'Content-Type': 'application/json',
						'X-Inertia': 'true'
					}
				}) as any
			}

			const isDev = process.env.APP_ENV !== 'production'
			const vitePreamble = isDev ? `
    <script type="module">
      import RefreshRuntime from 'http://localhost:5173/@react-refresh'
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
    ` : ''
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
    <title>Gravito DDD Store</title>
    ${vitePreamble}
    ${viteClient}
    ${viteEntry}
</head>
<body class="bg-gray-50">
    <div id="app" data-page='${JSON.stringify(page).replace(/'/g, "&apos;")}'></div>
    <script id="page-data" type="application/json">${JSON.stringify(page).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')}</script>
    <script>
      const pageData = JSON.parse(document.getElementById('page-data').textContent);
      window.__INITIAL_PAGE__ = pageData;
    </script>
</body>
</html>
			`.trim()

			return new Response(html, {
				status: 200,
				headers: { 'Content-Type': 'text/html' }
			}) as any
		},
	}
}
