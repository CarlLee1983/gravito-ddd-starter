/**
 * @file Payment.ts
 * @description Payment 聚合根，管理支付的生命週期與狀態轉換
 */

import { BaseEntity } from '@/Foundation/Domain/BaseEntity'
import type { DomainEvent } from '@/Foundation/Domain/DomainEvent'
import { PaymentId } from '../ValueObjects/PaymentId'
import { TransactionId } from '../ValueObjects/TransactionId'
import { Amount } from '../ValueObjects/Amount'
import { PaymentMethod } from '../ValueObjects/PaymentMethod'
import { PaymentStatus } from '../ValueObjects/PaymentStatus'
import { PaymentInitiated } from '../Events/PaymentInitiated'
import { PaymentSucceeded } from '../Events/PaymentSucceeded'
import { PaymentFailed } from '../Events/PaymentFailed'

/**
 * 支付屬性介面
 */
export interface PaymentProps {
	id: PaymentId
	orderId: string
	userId: string
	amount: Amount
	paymentMethod: PaymentMethod
	status: PaymentStatus
	transactionId?: TransactionId
	failureReason?: string
	createdAt: Date
	updatedAt: Date
}

/**
 * Payment 聚合根 - 支付狀態機管理
 * 狀態流: Initiated → (Succeeded | Failed)
 */
export class Payment extends BaseEntity {
	private domainEvents: DomainEvent[] = []

	private constructor(private props: PaymentProps) {
		super(props.id.value)
	}

	get id(): PaymentId {
		return this.props.id
	}

	get orderId(): string {
		return this.props.orderId
	}

	get userId(): string {
		return this.props.userId
	}

	get amount(): Amount {
		return this.props.amount
	}

	get paymentMethod(): PaymentMethod {
		return this.props.paymentMethod
	}

	get status(): PaymentStatus {
		return this.props.status
	}

	get transactionId(): TransactionId | undefined {
		return this.props.transactionId
	}

	get failureReason(): string | undefined {
		return this.props.failureReason
	}

	get createdAt(): Date {
		return this.props.createdAt
	}

	get updatedAt(): Date {
		return this.props.updatedAt
	}

	/**
	 * 建立新的支付聚合根
	 *
	 * @param orderId - 訂單 ID
	 * @param userId - 用戶 ID
	 * @param amount - 金額值物件
	 * @param paymentMethod - 支付方式值物件
	 * @returns 新建立的支付實例
	 */
	static create(
		orderId: string,
		userId: string,
		amount: Amount,
		paymentMethod: PaymentMethod
	): Payment {
		const paymentId = new PaymentId()
		const payment = new Payment({
			id: paymentId,
			orderId,
			userId,
			amount,
			paymentMethod,
			status: PaymentStatus.initiated(),
			createdAt: new Date(),
			updatedAt: new Date(),
		})

		// 發佈事件
		payment.addDomainEvent(
			new PaymentInitiated(paymentId, orderId, userId, amount, paymentMethod)
		)

		return payment
	}

	/**
	 * 從原始數據恢復支付聚合根
	 *
	 * @param data - 原始數據（通常來自資料庫）
	 * @returns 支付實例
	 */
	static fromDatabase(data: any): Payment {
		return new Payment({
			id: PaymentId.from(data.id),
			orderId: data.order_id,
			userId: data.user_id,
			amount: new Amount(data.amount_cents),
			paymentMethod: PaymentMethod.from(data.payment_method),
			status: PaymentStatus.from(data.status),
			transactionId: data.transaction_id ? TransactionId.from(data.transaction_id) : undefined,
			failureReason: data.failure_reason,
			createdAt: new Date(data.created_at),
			updatedAt: new Date(data.updated_at),
		})
	}

	/**
	 * 標記支付成功
	 *
	 * @param transactionId - 外部交易流水號值物件
	 * @throws Error 當狀態轉換無效時
	 */
	succeed(transactionId: TransactionId): void {
		if (!this.status.isInitiated()) {
			throw new Error(`無效的狀態轉換：${this.status.toString()} → 已支付`)
		}

		const newStatus = PaymentStatus.succeeded()
		if (!this.status.canTransitionTo(newStatus)) {
			throw new Error(`無法從 ${this.status.toString()} 轉換到 已支付`)
		}

		this.props = {
			...this.props,
			status: newStatus,
			transactionId,
			updatedAt: new Date(),
		}

		// 發佈事件
		this.addDomainEvent(
			new PaymentSucceeded(this.id, this.orderId, transactionId)
		)
	}

	/**
	 * 標記支付失敗
	 *
	 * @param reason - 失敗原因
	 * @throws Error 當狀態轉換無效時
	 */
	fail(reason: string): void {
		if (!this.status.isInitiated()) {
			throw new Error(`無效的狀態轉換：${this.status.toString()} → 支付失敗`)
		}

		const newStatus = PaymentStatus.failed()
		if (!this.status.canTransitionTo(newStatus)) {
			throw new Error(`無法從 ${this.status.toString()} 轉換到 支付失敗`)
		}

		this.props = {
			...this.props,
			status: newStatus,
			failureReason: reason,
			updatedAt: new Date(),
		}

		// 發佈事件
		this.addDomainEvent(
			new PaymentFailed(this.id, this.orderId, reason)
		)
	}

	/**
	 * 檢查支付是否已成功完成
	 *
	 * @returns 是否已支付
	 */
	isPaid(): boolean {
		return this.status.isSucceeded()
	}

	/**
	 * 檢查支付是否已標記為失敗
	 *
	 * @returns 是否失敗
	 */
	isFailed(): boolean {
		return this.status.isFailed()
	}

	/**
	 * 檢查支付是否仍在處理中（待支付）
	 *
	 * @returns 是否待支付
	 */
	isPending(): boolean {
		return this.status.isInitiated()
	}

	/**
	 * 向聚合根添加領域事件
	 *
	 * @param event - 領域事件對象
	 */
	addDomainEvent(event: DomainEvent): void {
		this.domainEvents.push(event)
	}

	/**
	 * 獲取所有掛起的領域事件
	 *
	 * @returns 領域事件數組
	 */
	getDomainEvents(): DomainEvent[] {
		return [...this.domainEvents]
	}

	/**
	 * 清除所有掛起的領域事件
	 */
	clearDomainEvents(): void {
		this.domainEvents = []
	}
}
