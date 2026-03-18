/**
 * @file NotificationController.test.ts
 * @description Notification Controller 測試
 *
 * 測試項目：
 * - 查詢日誌端點
 * - 發送通知端點
 * - 統計信息端點
 * - 清除日誌端點
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NotificationController, clearNotificationLogs, getNotificationLogs, addNotificationLog } from '../index'
import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { Response } from 'bun'
import type { INotificationMessages } from '../Presentation/Ports/INotificationMessages'

// Mock IHttpContext
const createMockHttpContext = (overrides?: Partial<IHttpContext>): IHttpContext => ({
	params: {},
	query: {},
	headers: {},
	getBodyText: vi.fn(),
	getJsonBody: vi.fn(),
	getHeader: vi.fn(),
	json: vi.fn((data, statusCode = 200) => ({ status: statusCode, body: JSON.stringify(data) } as any)),
	text: vi.fn(),
	html: vi.fn(),
	redirect: vi.fn(),
	render: vi.fn(),
	get: vi.fn(),
	set: vi.fn(),
	status: vi.fn(function () { return this }),
	setHeader: vi.fn(function () { return this }),
	type: vi.fn(function () { return this }),
	...overrides,
})

// Mock INotificationMessages
const createMockMessages = (): INotificationMessages => ({
	orderConfirmSubject: vi.fn(() => '訂單已確認'),
	orderConfirmSuccess: vi.fn(() => '訂單確認信已發送'),
	paymentSuccessSubject: vi.fn(() => '支付成功'),
	paymentSuccessNotified: vi.fn(() => '支付成功信已發送'),
	paymentFailedSubject: vi.fn(() => '支付失敗'),
	paymentFailedNotified: vi.fn(() => '支付失敗信已發送'),
	missingRecipient: vi.fn(() => '缺少收件人'),
	notificationSent: vi.fn(() => '通知已發送'),
	logsCleared: vi.fn(() => '日誌已清除'),
	missingLogId: vi.fn(() => '缺少日誌 ID'),
	logNotFound: vi.fn(() => '日誌未找到'),
})

describe('NotificationController 測試', () => {
	let controller: NotificationController
	let messages: INotificationMessages
	let mockCtx: IHttpContext

	beforeEach(() => {
		messages = createMockMessages()
		controller = new NotificationController(messages)
		mockCtx = createMockHttpContext()
		clearNotificationLogs()
	})

	afterEach(() => {
		clearNotificationLogs()
		vi.clearAllMocks()
	})

	describe('查詢日誌端點 (A3.6.3 - Endpoint 1)', () => {
		it('應返回空日誌列表', async () => {
			const response = await controller.queryLogs(mockCtx);

			expect(mockCtx.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					data: [],
					meta: expect.objectContaining({
						total: 0,
						returned: 0,
					}),
				})
			);
		})

		it('應返回所有日誌', async () => {
			addNotificationLog({
				id: 'notif-001',
				type: 'email',
				recipient: 'test@example.com',
				subject: 'Test',
				content: 'Test content',
				status: 'sent',
				createdAt: new Date(),
				sentAt: new Date(),
			});

			addNotificationLog({
				id: 'notif-002',
				type: 'sms',
				recipient: '1234567890',
				subject: 'Test SMS',
				content: 'SMS content',
				status: 'sent',
				createdAt: new Date(),
				sentAt: new Date(),
			});

			const response = await controller.queryLogs(mockCtx);

			expect(mockCtx.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					data: expect.arrayContaining([
						expect.objectContaining({ id: 'notif-001', type: 'email' }),
						expect.objectContaining({ id: 'notif-002', type: 'sms' }),
					]),
				})
			);
		})

		it('應按類型篩選日誌', async () => {
			addNotificationLog({
				id: 'email-001',
				type: 'email',
				recipient: 'test@example.com',
				subject: 'Email',
				content: 'Email content',
				status: 'sent',
				createdAt: new Date(),
			});

			addNotificationLog({
				id: 'sms-001',
				type: 'sms',
				recipient: '1234567890',
				subject: 'SMS',
				content: 'SMS content',
				status: 'sent',
				createdAt: new Date(),
			});

			mockCtx.query = { type: 'email' };

			const response = await controller.queryLogs(mockCtx);

			expect(mockCtx.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					data: expect.arrayContaining([
						expect.objectContaining({ id: 'email-001', type: 'email' }),
					]),
				})
			);
		})
	})

	describe('發送通知端點 (A3.6.3 - Endpoint 2)', () => {
		it('應成功發送通知', async () => {
			(mockCtx.getJsonBody as any) = vi.fn().mockResolvedValue({
				type: 'email',
				recipient: 'user@example.com',
				subject: 'Test',
				content: 'Content',
			});

			const response = await controller.sendNotification(mockCtx);

			expect(mockCtx.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					data: expect.objectContaining({
						type: 'email',
						recipient: 'user@example.com',
						status: 'sent',
					}),
					message: expect.any(String),
				})
			);
		})

		it('應驗證缺少收件人', async () => {
			(mockCtx.getJsonBody as any) = vi.fn().mockResolvedValue({
				type: 'email',
				subject: 'Test',
			});

			const response = await controller.sendNotification(mockCtx);

			expect(mockCtx.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: false,
					error: expect.any(String),
				}),
				400
			);
		})

		it('應處理請求體解析錯誤', async () => {
			(mockCtx.getJsonBody as any) = vi.fn().mockRejectedValue(new Error('Invalid JSON'));

			const response = await controller.sendNotification(mockCtx);

			expect(mockCtx.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: false,
					error: expect.stringContaining('Invalid JSON'),
				}),
				400
			);
		})
	})

	describe('統計信息端點 (A3.6.3 - Endpoint 3)', () => {
		it('應返回空統計信息', async () => {
			const response = await controller.getStats(mockCtx);

			expect(mockCtx.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					data: expect.objectContaining({
						total: 0,
						sent: 0,
						failed: 0,
						pending: 0,
						byType: { email: 0, sms: 0, push: 0 },
					}),
				})
			);
		})

		it('應正確計算統計信息', async () => {
			addNotificationLog({
				id: '001',
				type: 'email',
				recipient: 'test@example.com',
				subject: 'Test',
				content: 'Content',
				status: 'sent',
				createdAt: new Date(),
			});

			addNotificationLog({
				id: '002',
				type: 'email',
				recipient: 'test2@example.com',
				subject: 'Test 2',
				content: 'Content 2',
				status: 'failed',
				createdAt: new Date(),
				error: 'Failed',
			});

			addNotificationLog({
				id: '003',
				type: 'sms',
				recipient: '1234567890',
				subject: 'SMS',
				content: 'Content 3',
				status: 'pending',
				createdAt: new Date(),
			});

			const response = await controller.getStats(mockCtx);

			expect(mockCtx.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					data: expect.objectContaining({
						total: 3,
						sent: 1,
						failed: 1,
						pending: 1,
						byType: { email: 2, sms: 1, push: 0 },
					}),
				})
			);
		})
	})

	describe('清除日誌端點 (A3.6.3 - Endpoint 4)', () => {
		it('應清除所有日誌', async () => {
			addNotificationLog({
				id: '001',
				type: 'email',
				recipient: 'test@example.com',
				subject: 'Test',
				content: 'Content',
				status: 'sent',
				createdAt: new Date(),
			});

			addNotificationLog({
				id: '002',
				type: 'sms',
				recipient: '1234567890',
				subject: 'SMS',
				content: 'Content',
				status: 'sent',
				createdAt: new Date(),
			});

			expect(getNotificationLogs()).toHaveLength(2);

			const response = await controller.clearLogs(mockCtx);

			expect(mockCtx.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					message: expect.any(String),
					meta: { clearedCount: 2 },
				})
			);

			expect(getNotificationLogs()).toHaveLength(0);
		})

		it('應清除空日誌', async () => {
			const response = await controller.clearLogs(mockCtx);

			expect(mockCtx.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					meta: { clearedCount: 0 },
				})
			);
		})
	})

	describe('根據 ID 查詢日誌', () => {
		it('應成功查詢日誌', async () => {
			addNotificationLog({
				id: 'notif-123',
				type: 'email',
				recipient: 'test@example.com',
				subject: 'Test',
				content: 'Content',
				status: 'sent',
				createdAt: new Date(),
			});

			mockCtx.params = { id: 'notif-123' };

			const response = await controller.getLogById(mockCtx);

			expect(mockCtx.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					data: expect.objectContaining({
						id: 'notif-123',
						type: 'email',
					}),
				})
			);
		})

		it('應返回 404 當日誌不存在', async () => {
			mockCtx.params = { id: 'notif-999' };

			const response = await controller.getLogById(mockCtx);

			expect(mockCtx.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: false,
					error: expect.any(String),
				}),
				404
			);
		})

		it('應驗證缺少 ID', async () => {
			mockCtx.params = {};

			const response = await controller.getLogById(mockCtx);

			expect(mockCtx.json).toHaveBeenCalledWith(
				expect.objectContaining({
					success: false,
					error: expect.any(String),
				}),
				400
			);
		})
	})
})
