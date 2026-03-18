/**
 * @file NotificationJobs.test.ts
 * @description Notification Jobs 單元測試
 *
 * 測試項目（A3.6.1 - Job 測試 6 個）：
 * 1. SendOrderConfirmEmailJob - toJobPayload 方法
 * 2. SendPaymentSuccessEmailJob - toJobPayload 方法
 * 3. SendPaymentFailedEmailJob - toJobPayload 方法
 * 4. Job 重試配置驗證
 * 5. Job payload 序列化
 * 6. Job 名稱驗證
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SendOrderConfirmEmailJob, type SendOrderConfirmEmailData } from '../Application/Jobs/SendOrderConfirmEmailJob'
import { SendPaymentSuccessEmailJob, type SendPaymentSuccessEmailData } from '../Application/Jobs/SendPaymentSuccessEmailJob'
import { SendPaymentFailedEmailJob, type SendPaymentFailedEmailData } from '../Application/Jobs/SendPaymentFailedEmailJob'
import type { IMailer } from '@/Foundation/Infrastructure/Ports/Services/IMailer'
import type { ILogger } from '@/Foundation/Infrastructure/Ports/Services/ILogger'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

// Mock 實現
const createMockMailer = (): IMailer => ({
	send: vi.fn().mockResolvedValue(undefined),
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

describe('Notification Jobs 測試', () => {
	let mailer: IMailer
	let logger: ILogger
	let translator: ITranslator

	beforeEach(() => {
		mailer = createMockMailer()
		logger = createMockLogger()
		translator = createMockTranslator()
	})

	describe('SendOrderConfirmEmailJob (A3.6.1 - Job 1)', () => {
		it('應擁有正確的 jobName', async () => {
			const job = new SendOrderConfirmEmailJob(mailer, logger, translator);

			expect(job.jobName).toBe('notification.send_order_confirm_email');
		})

		it('應生成有效的 jobPayload', async () => {
			const job = new SendOrderConfirmEmailJob(mailer, logger, translator);
			const data: SendOrderConfirmEmailData = {
				orderId: 'order-001',
				email: 'user@example.com',
				amount: 99.99,
				customerName: 'John Doe',
				currency: 'USD',
			};

			const payload = job.toJobPayload(data);

			expect(payload).toMatchObject({
				meta: {
					jobName: 'notification.send_order_confirm_email',
					tries: expect.any(Number),
					backoff: expect.any(Number),
					delay: expect.any(Number),
				},
				data: expect.objectContaining(data),
				attempt: 1,
				enqueuedAt: expect.any(String),
			});
		})

		it('應擁有正確的重試配置', async () => {
			const job = new SendOrderConfirmEmailJob(mailer, logger, translator);

			expect(job.tries).toBe(3);
			expect(job.backoff).toBe(60);
			expect(job.delay).toBe(0);
		})

		it('應序列化 payload 為 JSON', async () => {
			const job = new SendOrderConfirmEmailJob(mailer, logger, translator);
			const data: SendOrderConfirmEmailData = {
				orderId: 'order-001',
				email: 'user@example.com',
				amount: 99.99,
				customerName: 'John Doe',
				currency: 'USD',
			};

			const payload = job.toJobPayload(data);
			const jsonStr = JSON.stringify(payload);

			expect(typeof jsonStr).toBe('string');
			expect(JSON.parse(jsonStr)).toEqual(payload);
		})
	})

	describe('SendPaymentSuccessEmailJob (A3.6.1 - Job 2)', () => {
		it('應擁有正確的 jobName', async () => {
			const job = new SendPaymentSuccessEmailJob(mailer, logger, translator);

			expect(job.jobName).toBe('notification.send_payment_success_email');
		})

		it('應生成有效的 jobPayload', async () => {
			const job = new SendPaymentSuccessEmailJob(mailer, logger, translator);
			const data: SendPaymentSuccessEmailData = {
				orderId: 'order-001',
				paymentId: 'payment-001',
				email: 'user@example.com',
				amount: 99.99,
				customerName: 'John Doe',
				currency: 'USD',
				transactionId: 'txn-001',
			};

			const payload = job.toJobPayload(data);

			expect(payload.meta.jobName).toBe('notification.send_payment_success_email');
			expect(payload.data).toMatchObject(data);
		})

		it('應擁有正確的重試配置', async () => {
			const job = new SendPaymentSuccessEmailJob(mailer, logger, translator);

			expect(job.tries).toBe(3);
			expect(job.backoff).toBe(60);
		})

		it('應支持完整的支付信息', async () => {
			const job = new SendPaymentSuccessEmailJob(mailer, logger, translator);
			const data: SendPaymentSuccessEmailData = {
				orderId: 'order-002',
				paymentId: 'payment-002',
				email: 'customer@example.com',
				amount: 199.99,
				customerName: 'Jane Smith',
				currency: 'EUR',
				transactionId: 'txn-002',
			};

			const payload = job.toJobPayload(data);

			expect(payload.data).toEqual(data);
		})
	})

	describe('SendPaymentFailedEmailJob (A3.6.1 - Job 3)', () => {
		it('應擁有正確的 jobName', async () => {
			const job = new SendPaymentFailedEmailJob(mailer, logger, translator);

			expect(job.jobName).toBe('notification.send_payment_failed_email');
		})

		it('應生成有效的 jobPayload', async () => {
			const job = new SendPaymentFailedEmailJob(mailer, logger, translator);
			const data: SendPaymentFailedEmailData = {
				orderId: 'order-001',
				paymentId: 'payment-001',
				email: 'user@example.com',
				customerName: 'John Doe',
				reason: 'Card declined',
			};

			const payload = job.toJobPayload(data);

			expect(payload.meta.jobName).toBe('notification.send_payment_failed_email');
			expect(payload.data).toMatchObject(data);
		})

		it('應擁有正確的重試配置', async () => {
			const job = new SendPaymentFailedEmailJob(mailer, logger, translator);

			expect(job.tries).toBe(3);
			expect(job.backoff).toBe(60);
		})

		it('應支持失敗原因信息', async () => {
			const job = new SendPaymentFailedEmailJob(mailer, logger, translator);
			const failureReasons = [
				'Insufficient funds',
				'Card expired',
				'Invalid card number',
				'Network timeout',
			];

			for (const reason of failureReasons) {
				const data: SendPaymentFailedEmailData = {
					orderId: 'order-001',
					paymentId: 'payment-001',
					email: 'user@example.com',
					customerName: 'John Doe',
					reason,
				};

				const payload = job.toJobPayload(data);

				expect(payload.data.reason).toBe(reason);
			}
		})
	})

	describe('Job Payload 結構驗證 (A3.6.1 - Job 5)', () => {
		it('應包含必要的 payload 字段', async () => {
			const job = new SendOrderConfirmEmailJob(mailer, logger, translator);
			const data: SendOrderConfirmEmailData = {
				orderId: 'order-001',
				email: 'user@example.com',
				amount: 99.99,
				customerName: 'John Doe',
				currency: 'USD',
			};

			const payload = job.toJobPayload(data);

			expect(payload).toHaveProperty('meta');
			expect(payload).toHaveProperty('data');
			expect(payload).toHaveProperty('attempt');
			expect(payload).toHaveProperty('enqueuedAt');
			expect(payload.meta).toHaveProperty('jobName');
			expect(payload.meta).toHaveProperty('tries');
			expect(payload.meta).toHaveProperty('backoff');
			expect(payload.meta).toHaveProperty('delay');
		})

		it('應正確序列化日期字段', async () => {
			const job = new SendOrderConfirmEmailJob(mailer, logger, translator);
			const data: SendOrderConfirmEmailData = {
				orderId: 'order-001',
				email: 'user@example.com',
				amount: 99.99,
				customerName: 'John Doe',
				currency: 'USD',
			};

			const payload = job.toJobPayload(data);

			expect(typeof payload.enqueuedAt).toBe('string');
			const parsedDate = new Date(payload.enqueuedAt);
			expect(parsedDate.getTime()).toBeLessThanOrEqual(Date.now());
		})
	})

	describe('Job 名稱驗證 (A3.6.1 - Job 6)', () => {
		it('所有 Job 應擁有唯一的名稱', async () => {
			const job1 = new SendOrderConfirmEmailJob(mailer, logger, translator);
			const job2 = new SendPaymentSuccessEmailJob(mailer, logger, translator);
			const job3 = new SendPaymentFailedEmailJob(mailer, logger, translator);

			const names = [job1.jobName, job2.jobName, job3.jobName];

			expect(new Set(names).size).toBe(3);
		})

		it('Job 名稱應使用正確的命名空間', async () => {
			const job1 = new SendOrderConfirmEmailJob(mailer, logger, translator);
			const job2 = new SendPaymentSuccessEmailJob(mailer, logger, translator);
			const job3 = new SendPaymentFailedEmailJob(mailer, logger, translator);

			expect(job1.jobName.startsWith('notification.')).toBe(true);
			expect(job2.jobName.startsWith('notification.')).toBe(true);
			expect(job3.jobName.startsWith('notification.')).toBe(true);
		})

		it('Job 名稱應包含具體的 Job 類型', async () => {
			const job1 = new SendOrderConfirmEmailJob(mailer, logger, translator);
			const job2 = new SendPaymentSuccessEmailJob(mailer, logger, translator);
			const job3 = new SendPaymentFailedEmailJob(mailer, logger, translator);

			expect(job1.jobName).toContain('order_confirm');
			expect(job2.jobName).toContain('payment_success');
			expect(job3.jobName).toContain('payment_failed');
		})
	})
})
