/**
 * @file GravitoTranslatorAdapter.ts
 * @description 對接 @gravito/prism 的翻譯適配器
 */

import type { ITranslator } from '../../Ports/Services/ITranslator'

export class GravitoTranslatorAdapter implements ITranslator {
	private locale: string = 'en'

	trans(key: string, replace?: Record<string, string | number>, _locale?: string): string {
		// TODO: 整合 @gravito/prism
		let message = key
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
		this.locale = locale
	}
}
