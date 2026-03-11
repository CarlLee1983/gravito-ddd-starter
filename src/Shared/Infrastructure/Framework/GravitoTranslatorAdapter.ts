/**
 * @file GravitoTranslatorAdapter.ts
 * @description 對接 @gravito/prism 的翻譯適配器
 */

import type { ITranslator } from '../ITranslator'
import { Prism } from '@gravito/prism'

export class GravitoTranslatorAdapter implements ITranslator {
	private prism: Prism

	constructor(prism: Prism) {
		this.prism = prism
	}

	trans(key: string, replace?: Record<string, string | number>, locale?: string): string {
		return this.prism.trans(key, replace, locale)
	}

	getLocale(): string {
		return this.prism.getLocale()
	}

	setLocale(locale: string): void {
		this.prism.setLocale(locale)
	}
}
