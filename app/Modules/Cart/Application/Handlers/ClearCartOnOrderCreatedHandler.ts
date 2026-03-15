/**
 * @file ClearCartOnOrderCreatedHandler.ts
 * @description 監聽訂單建立完成事件，清空對應的購物車
 */

import type { ICartRepository } from '../../Domain/Repositories/ICartRepository'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'

/**
 * 清空購物車事件處理器
 *
 * 當 Order 模組成功建立訂單發布 OrderCreated 事件時，
 * Cart 模組監聽此事件並清空對應使用者的購物車，實現最終一致性。
 */
export class ClearCartOnOrderCreatedHandler {
	constructor(
		private readonly cartRepository: ICartRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * 監聽的事件名稱（來自 Order 模組）
	 */
	get eventName(): string {
		return 'OrderPlaced'
	}

	/**
	 * 處理事件
	 *
	 * @param event - 事件乘載資料
	 */
	async handle(event: any): Promise<void> {
		try {
			// 如果是 IntegrationEvent，資料會在 data 中
			const payload = event.data || event
			const userId = payload.userId || event.aggregateId

			if (!userId) {
				this.logger.warn('[ClearCartOnOrderCreatedHandler] 收到 OrderCreated 事件，但缺少 userId')
				return
			}

			// 1. 取得購物車
			const cart = await this.cartRepository.findByUserId(userId)
			if (!cart) {
				this.logger.debug(`[ClearCartOnOrderCreatedHandler] 找不到使用者 ${userId} 的購物車，略過清空`)
				return
			}

			// 2. 清空購物車 (會發布 CartCleared 領域事件)
			cart.clear()

			// 3. 儲存狀態
			await this.cartRepository.save(cart)

			this.logger.info(`[ClearCartOnOrderCreatedHandler] 收到訂單建立事件，已清空使用者 ${userId} 的購物車`)
		} catch (error) {
			this.logger.error('[ClearCartOnOrderCreatedHandler] 處理 OrderCreated 事件時發生錯誤', error as Error)
		}
	}
}
