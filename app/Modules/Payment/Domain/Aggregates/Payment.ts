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
	 * 建立新的支付
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
	 * 從資料庫恢復
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
	 * 檢查是否已支付
	 */
	isPaid(): boolean {
		return this.status.isSucceeded()
	}

	/**
	 * 檢查是否支付失敗
	 */
	isFailed(): boolean {
		return this.status.isFailed()
	}

	/**
	 * 檢查是否待支付
	 */
	isPending(): boolean {
		return this.status.isInitiated()
	}

	/**
	 * 添加領域事件
	 */
	addDomainEvent(event: DomainEvent): void {
		this.domainEvents.push(event)
	}

	/**
	 * 取得所有領域事件
	 */
	getDomainEvents(): DomainEvent[] {
		return [...this.domainEvents]
	}

	/**
	 * 清除領域事件
	 */
	clearDomainEvents(): void {
		this.domainEvents = []
	}
}
