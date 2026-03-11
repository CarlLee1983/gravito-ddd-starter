/**
 * @file ITranslator.ts
 * @description 多語系翻譯介面 (Port)
 */

export interface ITranslator {
	/**
	 * 翻譯指定鍵名
	 * @param key - 翻譯鍵 (例如 'auth.failed')
	 * @param replace - 替換變數 (例如 { name: 'Carl' })
	 * @param locale - 指定語系 (選填)
	 */
	trans(key: string, replace?: Record<string, string | number>, locale?: string): string

	/**
	 * 取得當前語系
	 */
	getLocale(): string

	/**
	 * 設定當前語系
	 */
	setLocale(locale: string): void
}
