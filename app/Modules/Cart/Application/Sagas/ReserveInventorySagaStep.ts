/**
 * @file ReserveInventorySagaStep.ts
 * @description 預留庫存 Saga 步驟
 *
 * 在 CheckoutSaga 中的角色：
 * - 步驟 3（最後一步）：為訂單商品預留庫存
 * - 補償：若後續步驟失敗，釋放已預留的庫存
 *
 * 業務流程：
 * 1. 從訂單中提取所有商品行
 * 2. 逐個調用 inventoryPort.reserve() 預留庫存
 * 3. 保存預留資訊以供補償使用
 * 4. 若預留失敗（庫存不足、商品不存在），立即停止並觸發補償
 *
 * 補償流程：
 * 1. 檢查是否有已預留的商品
 * 2. 逐個調用 inventoryPort.release() 釋放預留
 * 3. 記錄補償結果
 */

import type { IInventoryCommandPort } from '@/Modules/Cart/Domain/Ports/IInventoryCommandPort'
import type { ISagaStep, SagaContext } from '@/Foundation/Application/Sagas/ISaga'
import type { CheckoutSagaInput } from './CheckoutSaga'

/**
 * 預留庫存結果
 */
interface ReservationResult {
	productId: string
	quantity: number
	reservationId: string
	reserved: number
	available: number
}

/**
 * 預留庫存步驟輸出
 */
interface ReserveInventoryResult {
	reservations: ReservationResult[]
	totalReserved: number
}

/**
 * 預留庫存 Saga 步驟
 *
 * 職責：
 * 1. 從 CreateOrder 步驟中獲取訂單資訊
 * 2. 為訂單中的每個商品預留庫存
 * 3. 若預留失敗，觸發補償（釋放已預留的庫存）
 * 4. 保存預留結果供後續步驟或補償使用
 *
 * @remarks
 * 此步驟必須在 InitiatePaymentStep 之後執行，以確保：
 * - 訂單已建立（有訂單 ID）
 * - 支付已發起（若庫存預留失敗，可回滾支付）
 * - 庫存變更可追蹤（關聯至特定訂單）
 */
export class ReserveInventorySagaStep implements ISagaStep {
	readonly name = 'ReserveInventory'

	constructor(
		private inventoryPort: IInventoryCommandPort,
		private cartItems: Array<{ productId: string; quantity: number }>
	) {}

	/**
	 * 執行庫存預留
	 *
	 * 流程：
	 * 1. 驗證購物車商品列表不為空
	 * 2. 逐個預留商品庫存
	 * 3. 保存預留結果
	 * 4. 返回預留結果供補償時使用
	 *
	 * @param input - Saga 輸入
	 * @param context - Saga 上下文（包含前置步驟結果）
	 * @returns 預留結果（預留清單和總數）
	 * @throws Error 若庫存不足或商品不存在
	 */
	async execute(input: CheckoutSagaInput, context: SagaContext): Promise<ReserveInventoryResult> {
		// 1. 驗證購物車商品
		if (!this.cartItems || this.cartItems.length === 0) {
			throw new Error('購物車為空，無法預留庫存')
		}

		// 2. 從 CreateOrder 步驟中獲取訂單 ID
		const createOrderResult = context.results.get('CreateOrder') as any
		const orderId = createOrderResult?.orderId

		if (!orderId) {
			throw new Error('訂單未建立，無法預留庫存')
		}

		console.log(
			`[ReserveInventorySagaStep] 為訂單 ${orderId} 預留庫存，商品數: ${this.cartItems.length}`
		)

		// 3. 逐個預留商品
		const reservations: ReservationResult[] = []
		let totalReserved = 0

		for (const item of this.cartItems) {
			try {
				const result = await this.inventoryPort.reserve(item.productId, item.quantity, orderId)

				reservations.push({
					productId: item.productId,
					quantity: item.quantity,
					reservationId: result.reservationId,
					reserved: result.reserved,
					available: result.available,
				})

				totalReserved += item.quantity

				console.log(
					`[ReserveInventorySagaStep] 商品 ${item.productId} 預留成功: ${item.quantity} 件，剩餘 ${result.available} 件`
				)
			} catch (error) {
				// 預留失敗，拋出異常以觸發補償
				const errorMessage = error instanceof Error ? error.message : String(error)
				console.error(
					`[ReserveInventorySagaStep] 商品 ${item.productId} 預留失敗: ${errorMessage}`
				)
				throw new Error(
					`庫存預留失敗 - 商品 ${item.productId}: ${errorMessage}`
				)
			}
		}

		console.log(
			`[ReserveInventorySagaStep] 所有商品預留完成，訂單 ${orderId}，總計 ${totalReserved} 件`
		)

		return {
			reservations,
			totalReserved,
		}
	}

	/**
	 * 補償庫存預留
	 *
	 * 當後續步驟失敗時，釋放已預留的庫存。
	 * 補償流程：
	 * 1. 檢查 ReserveInventory 結果是否存在
	 * 2. 逐個釋放預留商品
	 * 3. 記錄補償結果
	 *
	 * @param context - Saga 上下文（包含預留結果）
	 * @throws 補償異常只記錄，不中斷（由 SequentialSaga 處理）
	 */
	async compensate(context: SagaContext): Promise<void> {
		// 1. 檢查是否有預留結果
		const reserveResult = context.results.get('ReserveInventory') as ReserveInventoryResult | undefined

		if (!reserveResult || reserveResult.reservations.length === 0) {
			console.log('[ReserveInventorySagaStep] 補償：無需釋放庫存（未進行預留）')
			return
		}

		// 2. 從 CreateOrder 步驟中獲取訂單 ID
		const createOrderResult = context.results.get('CreateOrder') as any
		const orderId = createOrderResult?.orderId

		if (!orderId) {
			console.warn('[ReserveInventorySagaStep] 補償：無法獲取訂單 ID，跳過庫存釋放')
			return
		}

		console.log(
			`[ReserveInventorySagaStep] 補償：釋放訂單 ${orderId} 的庫存，商品數: ${reserveResult.reservations.length}`
		)

		// 3. 逐個釋放預留（倒序，確保 LIFO 順序）
		for (let i = reserveResult.reservations.length - 1; i >= 0; i--) {
			const reservation = reserveResult.reservations[i]

			try {
				await this.inventoryPort.release(
					reservation.productId,
					reservation.quantity,
					orderId,
					'checkout_failed'
				)

				console.log(
					`[ReserveInventorySagaStep] 商品 ${reservation.productId} 庫存已釋放: ${reservation.quantity} 件`
				)
			} catch (error) {
				// 釋放失敗記錄警告但繼續（防止補償中斷）
				const errorMessage = error instanceof Error ? error.message : String(error)
				console.warn(
					`[ReserveInventorySagaStep] 補償失敗 - 商品 ${reservation.productId} 庫存釋放失敗: ${errorMessage}`
				)
				// 補償失敗不拋出異常，由 SequentialSaga 記錄
			}
		}

		console.log(
			`[ReserveInventorySagaStep] 補償完成：訂單 ${orderId} 的庫存已全部釋放`
		)
	}
}
