/**
 * @file RefundSaga.ts
 * @description 退款 Saga 協調器 — 跨模組協調 Order 狀態、Inventory 回補、Payment 退款
 *
 * 在 DDD 架構中的角色：
 * - Application 層：使用案例協調（跨聚合根長時間執行流程）
 * - 職責：確保退款流程的原子性，失敗時自動補償
 *
 * 業務流程：
 * 1. StoreInputStep：保存輸入至 context 供補償步驟使用
 * 2. UpdateOrderStatusStep：將訂單標記為退款中
 * 3. RestoreInventoryStep：若需要，回補庫存
 * 4. ProcessPaymentRefundStep：向支付閘道發起退款
 *
 * 補償流程（倒序）：
 * - ProcessPaymentRefund 失敗 → 回滾 Inventory（deductStock） + Order 狀態（restoreStatus）
 * - RestoreInventory 失敗 → 回滾 Order 狀態（restoreStatus）
 * - UpdateOrderStatus 失敗 → 無需補償
 */

import { SequentialSaga } from '@/Foundation/Infrastructure/Sagas/SequentialSaga'
import type { ISagaStep, SagaContext } from '@/Foundation/Application/Sagas/ISaga'

// ─────────────────────────────────────────────────────────────────────────────
// 輸入型別
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RefundSaga 輸入資料
 */
export interface RefundSagaInput {
	refundId: string
	orderId: string
	paymentId: string
	refundAmountCents: number
	currency: string
	restoreInventory: boolean
	inventoryItems: Array<{ productId: string; quantity: number }>
}

// ─────────────────────────────────────────────────────────────────────────────
// 服務介面（在 Application 層定義，由 Infrastructure 實現）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 訂單退款服務介面
 */
interface IOrderRefundService {
	/** 將訂單標記為退款中 */
	markRefunding(orderId: string): Promise<void>
	/** 回滾訂單狀態（補償） */
	restoreStatus(orderId: string): Promise<void>
}

/**
 * 庫存退款 Port（防腐層）
 */
interface IInventoryRefundPort {
	/** 回補庫存（退款） */
	restoreStock(productId: string, quantity: number): Promise<void>
	/** 扣減庫存（補償回滾） */
	deductStock(productId: string, quantity: number): Promise<void>
}

/**
 * 支付退款服務介面
 */
interface IPaymentRefundService {
	/** 向支付閘道發起退款，返回閘道退款 ID */
	refund(paymentId: string, amountCents: number, currency: string): Promise<string>
}

// ─────────────────────────────────────────────────────────────────────────────
// Saga 步驟
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 步驟 1：儲存輸入至 context
 *
 * 讓補償步驟能透過 context.results.get('__input') 存取原始輸入。
 */
class StoreInputStep implements ISagaStep {
	readonly name = '__input'

	async execute(input: RefundSagaInput, _context: SagaContext): Promise<RefundSagaInput> {
		return input
	}

	async compensate(_context: SagaContext): Promise<void> {
		// 無需補償
	}
}

/**
 * 步驟 2：更新訂單狀態為退款中
 */
class UpdateOrderStatusStep implements ISagaStep {
	readonly name = 'UpdateOrderStatus'

	constructor(private orderService: IOrderRefundService) {}

	async execute(input: RefundSagaInput, _context: SagaContext): Promise<void> {
		await this.orderService.markRefunding(input.orderId)
	}

	async compensate(context: SagaContext): Promise<void> {
		const input = context.results.get('__input') as RefundSagaInput | undefined
		if (!input) return
		await this.orderService.restoreStatus(input.orderId)
	}
}

/**
 * 步驟 3：回補庫存（若需要）
 */
class RestoreInventoryStep implements ISagaStep {
	readonly name = 'RestoreInventory'

	constructor(private inventoryPort: IInventoryRefundPort) {}

	async execute(input: RefundSagaInput, _context: SagaContext): Promise<void> {
		if (!input.restoreInventory) return

		for (const item of input.inventoryItems) {
			await this.inventoryPort.restoreStock(item.productId, item.quantity)
		}
	}

	async compensate(context: SagaContext): Promise<void> {
		const input = context.results.get('__input') as RefundSagaInput | undefined
		if (!input?.restoreInventory) return

		for (const item of input.inventoryItems) {
			await this.inventoryPort.deductStock(item.productId, item.quantity)
		}
	}
}

/**
 * 步驟 4：向支付閘道發起退款
 *
 * 注意：支付退款不可撤銷，補償為 no-op。
 */
class ProcessPaymentRefundStep implements ISagaStep {
	readonly name = 'ProcessPaymentRefund'

	constructor(private paymentService: IPaymentRefundService) {}

	async execute(input: RefundSagaInput, _context: SagaContext): Promise<string> {
		return this.paymentService.refund(input.paymentId, input.refundAmountCents, input.currency)
	}

	async compensate(_context: SagaContext): Promise<void> {
		// 支付退款不可逆，無法補償
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 工廠函數
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 建立 RefundSaga 實例
 *
 * @param orderService - 訂單退款服務
 * @param inventoryPort - 庫存退款 Port
 * @param paymentService - 支付退款服務
 * @returns 配置完整的 SequentialSaga
 */
export function createRefundSaga(
	orderService: IOrderRefundService,
	inventoryPort: IInventoryRefundPort,
	paymentService: IPaymentRefundService,
): SequentialSaga {
	return new SequentialSaga([
		new StoreInputStep(),
		new UpdateOrderStatusStep(orderService),
		new RestoreInventoryStep(inventoryPort),
		new ProcessPaymentRefundStep(paymentService),
	])
}
