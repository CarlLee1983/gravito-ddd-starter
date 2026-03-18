/**
 * @file NotificationHandlers.test.ts
 * @description Notification Event Handlers 測試
 *
 * 測試項目（A3.6.2 - Subscriber 測試 6 個）：
 * 1. SendOrderConfirmEmailHandler - 訂閱 OrderPlaced 事件
 * 2. SendPaymentSuccessEmailHandler - 訂閱 PaymentSucceeded 事件
 * 3. SendPaymentFailedEmailHandler - 訂閱 PaymentFailed 事件
 * 4. Handler 錯誤處理 - 異常傳播
 * 5. Handler 日誌記錄 - 驗證正確的日誌輸出
 * 6. Handler Job 分派 - 驗證 Job 正確推入隊列
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SendOrderConfirmEmailHandler } from '../Application/Handlers/SendOrderConfirmEmailHandler'
import { SendPaymentSuccessEmailHandler } from '../Application/Handlers/SendPaymentSuccessEmailHandler'
import { SendPaymentFailedEmailHandler } from '../Application/Handlers/SendPaymentFailedEmailHandler'
import { OrderPlaced } from '@/Modules/Order/Domain/Events/OrderPlaced'
import { OrderId } from '@/Modules/Order/Domain/ValueObjects/OrderId'
import { Money } from '@/Modules/Order/Domain/ValueObjects/Money'
import { OrderTotal } from '@/Modules/Order/Domain/ValueObjects/OrderTotal'
import { PaymentSucceeded } from '@/Modules/Payment/Domain/Events/PaymentSucceeded'
import { PaymentFailed } from '@/Modules/Payment/Domain/Events/PaymentFailed'
import { PaymentId } from '@/Modules/Payment/Domain/ValueObjects/PaymentId'
import { TransactionId } from '@/Modules/Payment/Domain/ValueObjects/TransactionId'
import type { IJobQueue } from '@/Foundation/Infrastructure/Ports/Messaging/IJobQueue'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

// Mock 實現
const createMockJobQueue = (): IJobQueue => ({
	push: vi.fn().mockResolvedValue(undefined),
	process: vi.fn(),
})

const createMockLogger = (): ILogger => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
})

const createMockTranslator = (): ITranslator => ({
	trans: vi.fn((key) => key),
	choice: vi.fn((key) => key),
	setLocale: vi.fn(),
	getLocale: vi.fn(() => 'en'),
})

describe('Notification Event Handlers 測試', () => {
	let jobQueue: IJobQueue
	let logger: ILogger
	let translator: ITranslator

	beforeEach(() => {
		jobQueue = createMockJobQueue()
		logger = createMockLogger()
		translator = createMockTranslator()
	})

	describe('SendOrderConfirmEmailHandler (A3.6.2 - Subscriber 1)', () => {
		it('應訂閱 OrderPlaced 事件並分派 Job', async () => {
			const handler = new SendOrderConfirmEmailHandler(jobQueue, logger, translator);

			const orderId = OrderId.create('order-001');
			const subtotal = Money.create(99.99, 'USD');
			const orderTotal = OrderTotal.create(subtotal, 0);
			const event = new OrderPlaced(orderId, 'user-001', orderTotal);

			await handler.handle(event);

			expect(jobQueue.push).toHaveBeenCalledWith(
				'notification.send_order_confirm_email',
				expect.any(Object)
			);
		})

		it('應正確提取事件資料', async () => {
			const handler = new SendOrderConfirmEmailHandler(jobQueue, logger, translator);

			const orderId = OrderId.create('order-123');
			const subtotal = Money.create(199.99, 'EUR');
			const orderTotal = OrderTotal.create(subtotal, 10.00);
			const event = new OrderPlaced(orderId, 'user-456', orderTotal);

			await handler.handle(event);

			expect(logger.info).toHaveBeenCalled();
			expect((translator.trans as any).mock.calls[0][0]).toBe('notification.order_placed_received');
		})

		it('應記錄 Job 分派日誌', async () => {
			const handler = new SendOrderConfirmEmailHandler(jobQueue, logger, translator);

			const orderId = OrderId.create('order-001');
			const subtotal = Money.create(99.99, 'USD');
			const orderTotal = OrderTotal.create(subtotal, 0);
			const event = new OrderPlaced(orderId, 'user-001', orderTotal);

			await handler.handle(event);

			expect(logger.debug).toHaveBeenCalledWith(
				expect.stringContaining('dispatched'),
			);
		})
	})

	describe('SendPaymentSuccessEmailHandler (A3.6.2 - Subscriber 2)', () => {
		it('應訂閱 PaymentSucceeded 事件並分派 Job', async () => {
			const handler = new SendPaymentSuccessEmailHandler(jobQueue, logger, translator);

			const paymentId = new PaymentId('payment-001');
			const transactionId = new TransactionId('txn-001');
			const event = new PaymentSucceeded(paymentId, 'order-001', transactionId);

			await handler.handle(event);

			expect(jobQueue.push).toHaveBeenCalledWith(
				'notification.send_payment_success_email',
				expect.any(Object)
			);
		})

		it('應正確提取支付成功事件資料', async () => {
			const handler = new SendPaymentSuccessEmailHandler(jobQueue, logger, translator);

			const paymentId = new PaymentId('payment-002');
			const transactionId = new TransactionId('txn-999');
			const event = new PaymentSucceeded(paymentId, 'order-999', transactionId);

			await handler.handle(event);

			expect(logger.info).toHaveBeenCalled();
		})
	})

	describe('SendPaymentFailedEmailHandler (A3.6.2 - Subscriber 3)', () => {
		it('應訂閱 PaymentFailed 事件並分派 Job', async () => {
			const handler = new SendPaymentFailedEmailHandler(jobQueue, logger, translator);

			const paymentId = new PaymentId('payment-001');
			const event = new PaymentFailed(paymentId, 'order-001', 'Card declined');

			await handler.handle(event);

			expect(jobQueue.push).toHaveBeenCalledWith(
				'notification.send_payment_failed_email',
				expect.any(Object)
			);
		})

		it('應正確提取支付失敗事件資料', async () => {
			const handler = new SendPaymentFailedEmailHandler(jobQueue, logger, translator);

			const paymentId = new PaymentId('payment-002');
			const event = new PaymentFailed(paymentId, 'order-888', 'Insufficient funds');

			await handler.handle(event);

			expect(logger.info).toHaveBeenCalled();
		})
	})

	describe('Handler 錯誤處理 (A3.6.2 - Subscriber 4)', () => {
		it('應當 Job 隊列錯誤時傳播異常', async () => {
			const errorQueue: IJobQueue = {
				push: vi.fn().mockRejectedValue(new Error('Queue error')),
				process: vi.fn(),
			};

			const handler = new SendOrderConfirmEmailHandler(errorQueue, logger, translator);

			const orderId = OrderId.create('order-001');
			const subtotal = Money.create(99.99, 'USD');
			const orderTotal = OrderTotal.create(subtotal, 0);
			const event = new OrderPlaced(orderId, 'user-001', orderTotal);

			await expect(handler.handle(event)).rejects.toThrow('Queue error');
		})

		it('應記錄錯誤日誌', async () => {
			const errorQueue: IJobQueue = {
				push: vi.fn().mockRejectedValue(new Error('Job dispatch failed')),
				process: vi.fn(),
			};

			const handler = new SendOrderConfirmEmailHandler(errorQueue, logger, translator);

			const orderId = OrderId.create('order-001');
			const subtotal = Money.create(99.99, 'USD');
			const orderTotal = OrderTotal.create(subtotal, 0);
			const event = new OrderPlaced(orderId, 'user-001', orderTotal);

			try {
				await handler.handle(event);
			} catch {
				// Expected
			}

			expect(logger.error).toHaveBeenCalled();
		})
	})

	describe('Handler 日誌記錄 (A3.6.2 - Subscriber 5)', () => {
		it('應在接收事件時記錄信息日誌', async () => {
			const handler = new SendOrderConfirmEmailHandler(jobQueue, logger, translator);

			const orderId = OrderId.create('order-001');
			const subtotal = Money.create(99.99, 'USD');
			const orderTotal = OrderTotal.create(subtotal, 0);
			const event = new OrderPlaced(orderId, 'user-001', orderTotal);

			await handler.handle(event);

			expect(logger.info).toHaveBeenCalled();
			// Verify that translator was called to get the message
			expect((translator.trans as any).mock.calls[0][0]).toBe('notification.order_placed_received');
		})
	})

	describe('Handler Job 分派驗證 (A3.6.2 - Subscriber 6)', () => {
		it('應將 Job 推入隊列且包含正確的 jobName', async () => {
			const handler = new SendOrderConfirmEmailHandler(jobQueue, logger, translator);

			const orderId = OrderId.create('order-001');
			const subtotal = Money.create(99.99, 'USD');
			const orderTotal = OrderTotal.create(subtotal, 0);
			const event = new OrderPlaced(orderId, 'user-001', orderTotal);

			await handler.handle(event);

			const call = (jobQueue.push as any).mock.calls[0];
			expect(call[0]).toBe('notification.send_order_confirm_email');

			const jobPayload = call[1];
			expect(jobPayload).toHaveProperty('meta');
			expect(jobPayload).toHaveProperty('data');
			expect(jobPayload.data).toHaveProperty('orderId');
			expect(jobPayload.data).toHaveProperty('email');
		})

		it('應多次成功分派不同的 Job', async () => {
			const handler1 = new SendOrderConfirmEmailHandler(jobQueue, logger, translator);
			const handler2 = new SendPaymentSuccessEmailHandler(jobQueue, logger, translator);
			const handler3 = new SendPaymentFailedEmailHandler(jobQueue, logger, translator);

			const orderId = OrderId.create('order-001');
			const subtotal = Money.create(99.99, 'USD');
			const orderTotal = OrderTotal.create(subtotal, 0);
			const event1 = new OrderPlaced(orderId, 'user-001', orderTotal);

			const paymentId = new PaymentId('payment-001');
			const transactionId = new TransactionId('txn-001');
			const event2 = new PaymentSucceeded(paymentId, 'order-001', transactionId);

			const paymentId2 = new PaymentId('payment-002');
			const event3 = new PaymentFailed(paymentId2, 'order-001', 'Card declined');

			await handler1.handle(event1);
			await handler2.handle(event2);
			await handler3.handle(event3);

			expect(jobQueue.push).toHaveBeenCalledTimes(3);
		})
	})
})
