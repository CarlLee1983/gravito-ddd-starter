/**
 * @file CartCheckoutRequestedHandler.ts
 * @description 購物車結帳事件處理器
 *
 * 監聽 CartCheckoutRequested 事件，自動建立訂單
 */

import type { PlaceOrderService } from '../Services/PlaceOrderService'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'

/**
 * 購物車結帳事件處理器
 *
 * 當購物車發佈 CartCheckoutRequested 事件時：
 * 1. 提取事件資料（userId、items、totalAmount）
 * 2. 呼叫 PlaceOrderService.execute()
 * 3. 建立新的訂單聚合根
 */
export class CartCheckoutRequestedHandler {
	constructor(
		private placeOrderService: PlaceOrderService,
		private logger?: ILogger
	) {}

	async handle(event: any): Promise<void> {
		try {
			// 支援兩種事件格式：DomainEvent (properties directly) 或 IntegrationEvent (nested in data)
			const userId = event.userId || event.data?.userId
			let items = event.items || event.data?.items || []

			// 如果 items 是字符串（從 IntegrationEvent），解析它
			if (typeof items === 'string') {
				items = JSON.parse(items)
			}

			const taxAmount = event.taxAmount || event.data?.taxAmount || 0

			this.logger?.info(
				`[CartCheckoutRequestedHandler] 處理 CartCheckoutRequested 事件: userId=${userId}, items count=${items.length}`
			)

			// 轉換購物車項目格式為 OrderLineDTO 格式
			const orderLines = items.map((item: any) => ({
				productId: item.productId,
				productName: item.productName || `Product ${item.productId}`,
				quantity: item.quantity,
				unitPrice: item.unitPrice || item.price || 0,
			}))

			// 從事件提取資料並建立訂單
			await this.placeOrderService.execute({
				userId,
				lines: orderLines,
				taxAmount,
			})

			this.logger?.info(
				`[CartCheckoutRequestedHandler] 訂單建立成功: userId=${event.userId}`
			)
		} catch (error) {
			this.logger?.error(
				'[CartCheckoutRequestedHandler] 建立訂單失敗',
				error as Error
			)
			throw error
		}
	}
}
