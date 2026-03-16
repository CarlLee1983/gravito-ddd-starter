/**
 * @file CartMessageService.ts
 * @description 購物車訊息服務實現
 *
 * 包裝 ITranslator，提供類型安全的購物車訊息方法。
 * 好處：
 * - 編譯時檢查（無拼寫錯誤）
 * - 簡潔的方法名稱（cartMessages.notFound()）
 * - 集中管理翻譯鍵
 * - 易於測試和重構
 */

import type { ICartMessages } from '@/Modules/Cart/Presentation/Ports/ICartMessages'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

export class CartMessageService implements ICartMessages {
	/**
	 * 建構子
	 *
	 * @param translator - 翻譯服務
	 */
	constructor(private translator: ITranslator) {}

	/**
	 * 購物車不存在
	 *
	 * @returns 錯誤訊息字串
	 */
	notFound(): string {
		return this.translator.trans('cart.not_found')
	}

	/**
	 * 缺少必要欄位（商品 ID 或數量）
	 *
	 * @returns 錯誤訊息字串
	 */
	missingRequiredFields(): string {
		return this.translator.trans('cart.missing_required_fields')
	}

	/**
	 * 購物車狀態已變更（樂觀鎖衝突）
	 *
	 * @returns 錯誤訊息字串
	 */
	stateChangedConflict(): string {
		return this.translator.trans('cart.state_changed_conflict')
	}

	/**
	 * 缺少數量欄位
	 *
	 * @returns 錯誤訊息字串
	 */
	missingQuantityField(): string {
		return this.translator.trans('cart.missing_quantity_field')
	}

	/**
	 * 購物車已清空
	 *
	 * @returns 成功訊息字串
	 */
	clearSuccess(): string {
		return this.translator.trans('cart.clear_success')
	}

	/**
	 * 結帳成功，訂單已建立
	 *
	 * @returns 成功訊息字串
	 */
	checkoutSuccess(): string {
		return this.translator.trans('cart.checkout_success')
	}
}
