/**
 * @file GravitoTranslatorAdapter.ts
 * @description 多語系翻譯適配器，從 locales/ 目錄加載 JSON 翻譯檔
 */

import type { ITranslator } from '../../Ports/Services/ITranslator'
import { resolve } from 'path'
import { existsSync, readFileSync } from 'fs'

export class GravitoTranslatorAdapter implements ITranslator {
	private locale: string = 'en'
	private translations: Map<string, Record<string, any>> = new Map()
	private defaultLocale: string = 'en'

	constructor(localesPath: string = resolve(process.cwd(), 'locales')) {
		this.loadLocale('en', localesPath)
		this.loadLocale('zh-TW', localesPath)
	}

	/**
	 * 加載指定語系的翻譯檔
	 */
	private loadLocale(locale: string, localesPath: string): void {
		try {
			const localePath = resolve(localesPath, locale)
			if (!existsSync(localePath)) return

			const files = require('fs').readdirSync(localePath).filter((f: string) => f.endsWith('.json'))
			const localeMessages: Record<string, any> = {}

			for (const file of files) {
				const filePath = resolve(localePath, file)
				const content = readFileSync(filePath, 'utf-8')
				const namespace = file.replace('.json', '')
				localeMessages[namespace] = JSON.parse(content)
			}

			this.translations.set(locale, localeMessages)
		} catch (error) {
			console.warn(`[Translator] Failed to load locale "${locale}":`, error)
		}
	}

	/**
	 * 翻譯指定鍵名
	 * 格式：'namespace.key.subkey'
	 * 範例：trans('auth.login.success')
	 */
	trans(key: string, replace?: Record<string, string | number>, locale?: string): string {
		const targetLocale = locale || this.locale
		const translations = this.translations.get(targetLocale) || this.translations.get(this.defaultLocale)

		if (!translations) {
			return key // 如果找不到翻譯，回傳原始鍵
		}

		const keys = key.split('.')
		let value: any = translations

		for (const k of keys) {
			value = value?.[k]
			if (value === undefined) {
				return key // 如果路徑不存在，回傳原始鍵
			}
		}

		// 替換變數 (格式：':varName')
		let message = String(value)
		if (replace) {
			Object.entries(replace).forEach(([k, v]) => {
				message = message.replace(`:${k}`, String(v))
			})
		}

		return message
	}

	getLocale(): string {
		return this.locale
	}

	setLocale(locale: string): void {
		// WARNING: 此類為 singleton，若需要請求級別的 locale 隔離，應使用 context-aware 存儲
		// 例如：AsyncLocalStorage 或請求上下文
		if (this.translations.has(locale)) {
			this.locale = locale
		}
	}
}
