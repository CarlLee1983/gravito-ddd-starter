/**
 * @file OrderQueryAdapter.ts
 * @description 訂單查詢適配器 — 實現 IOrderQueryPort，橋接 Order 模組
 *
 * 防腐層設計：將 Order Context 的 domain 物件轉換為 Refund Context
 * 所需的 OrderContext 值物件，隔離兩個 Bounded Context 的直接耦合。
 */

import type { IOrderQueryPort } from '../../Domain/Ports/IOrderQueryPort'
import { OrderContext } from '../../Domain/ValueObjects/OrderContext'
import type { OrderLineSnapshot } from '../../Domain/ValueObjects/OrderContext'

/**
 * 訂單查詢適配器
 *
 * 接收任意 OrderRepository（使用 any 避免跨模組型別耦合），
 * 透過防腐層轉換成 Refund Domain 所需的 OrderContext。
 */
export class OrderQueryAdapter implements IOrderQueryPort {
	constructor(private readonly orderRepository: any) {}

	/**
	 * 根據訂單 ID 取得訂單上下文
	 *
	 * @param orderId - 訂單 ID 字串
	 * @returns OrderContext 值物件
	 * @throws 若訂單不存在
	 */
	async getOrderContext(orderId: string): Promise<OrderContext> {
		// 嘗試用不同方式查詢（支援不同 OrderRepository 實作）
		let order: any = null

		if (typeof this.orderRepository.findById === 'function') {
			try {
				// Order Repository 使用 OrderId value object
				const OrderId = await this.tryImportOrderId()
				if (OrderId) {
					const orderIdVo = OrderId.fromString(orderId)
					order = await this.orderRepository.findById(orderIdVo)
				}
			} catch {
				// fallback：直接傳字串
				order = await this.orderRepository.findById(orderId).catch(() => null)
			}
		}

		if (!order) {
			throw new Error(`訂單不存在: ${orderId}`)
		}

		return this.toOrderContext(order)
	}

	/** 嘗試動態匯入 OrderId（避免硬性跨模組依賴） */
	private async tryImportOrderId(): Promise<any> {
		try {
			const { OrderId } = await import('@/Modules/Order/Domain/ValueObjects/OrderId')
			return OrderId
		} catch {
			return null
		}
	}

	/** 將 Order domain 物件轉換為 OrderContext 值物件 */
	private toOrderContext(order: any): OrderContext {
		const lines: OrderLineSnapshot[] = (order.lines ?? order.items ?? []).map((line: any) => ({
			orderLineId: line.id ?? line.orderLineId ?? '',
			productId: line.productId ?? line._productId ?? '',
			productName: line.productName ?? line._productName ?? '',
			// Order 的 Money 使用 amount（元），Refund 的 Money 使用 cents（分）
			unitPriceCents: this.toUnitPriceCents(line),
			quantity: line.quantity ?? line._quantity ?? 1,
		}))

		// 取得總金額（Order Money 使用 amount 欄位，單位為元）
		const totalAmount = order.total?.total ?? order.total
		const totalAmountCents = this.toAmountCents(totalAmount)
		const currency = this.extractCurrency(totalAmount, order)
		const resolvedOrderId = order.id ?? order.orderId?.value ?? order.orderId ?? ''

		return OrderContext.create({
			orderId: resolvedOrderId,
			orderDate: order.createdAt ?? order.placedAt ?? new Date(),
			totalAmountCents,
			discountAmountCents: 0,
			currency,
			paymentMethod: 'unknown',
			items: lines,
		})
	}

	/** 將訂單行單價轉換為分（cents） */
	private toUnitPriceCents(line: any): number {
		const price = line.unitPrice ?? line._unitPrice
		if (!price) return 0

		// Order Money 使用 amount（元），需轉換為分
		if (typeof price.amount === 'number') {
			return Math.round(price.amount * 100)
		}
		// 若已是 cents 格式
		if (typeof price.cents === 'number') {
			return price.cents
		}
		return 0
	}

	/** 將 Order Money 轉換為分（cents） */
	private toAmountCents(money: any): number {
		if (!money) return 0
		if (typeof money.amount === 'number') {
			return Math.round(money.amount * 100)
		}
		if (typeof money.cents === 'number') {
			return money.cents
		}
		return 0
	}

	/** 從 money 或 order 提取幣別 */
	private extractCurrency(money: any, order: any): string {
		if (money?.currency) return money.currency
		const anyLine = (order.lines ?? order.items ?? [])[0]
		const linePrice = anyLine?.unitPrice ?? anyLine?._unitPrice
		if (linePrice?.currency) return linePrice.currency
		return 'TWD'
	}
}


