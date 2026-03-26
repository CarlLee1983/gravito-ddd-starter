/**
 * @file RefundMessageService.ts
 * @description 退款訊息服務實現
 *
 * 包裝 ITranslator，提供類型安全的退款訊息方法。
 * 好處：
 * - 編譯時檢查（無拼寫錯誤）
 * - 簡潔的方法名稱（refundMessages.notFound()）
 * - 集中管理翻譯鍵
 * - 易於測試和重構
 */

import type { IRefundMessages } from '@/Modules/Refund/Presentation/Ports/IRefundMessages'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

export class RefundMessageService implements IRefundMessages {
	/**
	 * 建構子
	 *
	 * @param translator - 翻譯服務
	 */
	constructor(private translator: ITranslator) {}

	/**
	 * 退款申請不存在
	 */
	notFound(): string {
		return this.translator.trans('refund.not_found')
	}

	/**
	 * 退款正在處理中
	 */
	alreadyProcessing(): string {
		return this.translator.trans('refund.already_processing')
	}

	/**
	 * 無效的狀態轉換
	 */
	invalidStatusTransition(from: string, to: string): string {
		return this.translator.trans('refund.invalid_status_transition')
			.replace(':from', from)
			.replace(':to', to)
	}

	/**
	 * 退款申請已提交成功
	 */
	requestSuccess(): string {
		return this.translator.trans('refund.request_success')
	}

	/**
	 * 退款申請已通過審核
	 */
	approveSuccess(): string {
		return this.translator.trans('refund.approve_success')
	}

	/**
	 * 退款申請已拒絕
	 */
	rejectSuccess(): string {
		return this.translator.trans('refund.reject_success')
	}

	/**
	 * 退貨已標記寄出
	 */
	itemsShippedSuccess(): string {
		return this.translator.trans('refund.items_shipped_success')
	}

	/**
	 * 退貨已確認收到
	 */
	itemsReceivedSuccess(): string {
		return this.translator.trans('refund.items_received_success')
	}

	/**
	 * 退款完成（含金額）
	 */
	refundCompleted(amount: string): string {
		return this.translator.trans('refund.refund_completed').replace(':amount', amount)
	}

	/**
	 * 退款失敗
	 */
	refundFailed(): string {
		return this.translator.trans('refund.refund_failed')
	}

	/**
	 * 缺少必要欄位
	 */
	missingRequiredFields(): string {
		return this.translator.trans('refund.missing_required_fields')
	}

	/**
	 * 退款金額超過訂單金額
	 */
	exceedsOrderAmount(): string {
		return this.translator.trans('refund.exceeds_order_amount')
	}

	/**
	 * 此訂單不符合退款條件
	 */
	orderNotEligible(): string {
		return this.translator.trans('refund.order_not_eligible')
	}
}
