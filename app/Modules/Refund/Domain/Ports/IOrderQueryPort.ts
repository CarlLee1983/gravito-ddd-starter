import type { OrderContext } from '../ValueObjects/OrderContext'

/**
 * 訂單查詢 Port — Cart Domain 防腐層，隔離 Order Context 實作細節
 *
 * 定義在消費者（Refund 模組）側，由 Infrastructure 層實現。
 */
export interface IOrderQueryPort {
	getOrderContext(orderId: string): Promise<OrderContext>
}
