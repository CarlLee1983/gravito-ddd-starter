/**
 * @file QueueFlowIntegration.test.ts
 * @description 隊列完整流程整合測試
 *
 * 驗證從領域事件到隊列執行的完整流程：
 * UserCreated (DomainEvent)
 *   ↓ MemoryEventDispatcher.dispatch()
 *   ↓ SendWelcomeEmail.handle()
 *   ↓ MemoryJobQueueAdapter.push()
 *   ↓ SystemWorker.executeAll()
 *   ↓ SendWelcomeEmailJob.handle()
 *   ↓ IMailer.send()
 *
 * 此測試展示開發者如何整合事件、處理程序、隊列和工作。
 *
 * @module test/integration/queue/QueueFlow
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { MemoryEventDispatcher } from '@/Shared/Infrastructure/Events/Dispatchers/MemoryEventDispatcher'
import { MemoryJobQueueAdapter } from '@/Shared/Infrastructure/Adapters/Memory/MemoryJobQueueAdapter'
import { SendWelcomeEmail } from '@/Modules/User/Application/Handlers/SendWelcomeEmail'
import { SendWelcomeEmailJob } from '@/Modules/User/Application/Jobs/SendWelcomeEmailJob'
import { UserCreated } from '@/Modules/User/Domain/Events/UserCreated'
import type { IMailer } from '@/Shared/Infrastructure/Ports/Services/IMailer'
import type { ILogger } from '@/Shared/Infrastructure/Ports/Services/ILogger'
import type { ITranslator } from '@/Shared/Infrastructure/Ports/Services/ITranslator'

describe('隊列完整流程整合測試', () => {
	let eventDispatcher: MemoryEventDispatcher
	let jobQueue: MemoryJobQueueAdapter
	let sendWelcomeEmail: SendWelcomeEmail
	let sendWelcomeEmailJob: SendWelcomeEmailJob

	// Mock 服務
	let mailerCalls: Array<{ to: string; subject: string; text: string }> = []
	const mockMailer: IMailer = {
		send: async (options) => {
			if (options && options.to) {
				const to = typeof options.to === 'string' ? options.to : options.to[0]
				mailerCalls.push({
					to,
					subject: options.subject || '',
					text: options.text || '',
				})
			}
		},
		queue: async () => {},
	}

	const mockLogger: ILogger = {
		debug: () => {},
		info: () => {},
		warn: () => {},
		error: () => {},
	}

	const mockTranslator: ITranslator = {
		trans: (key: string, params?: Record<string, any>) => {
			if (key === 'user.created_log') return `User created: ${params?.id || ''}`
			if (key === 'user.welcome_email_sending') return `Sending welcome email to user: ${params?.id || ''}`
			if (key === 'user.welcome_subject') return `Welcome ${params?.name || ''}!`
			if (key === 'user.welcome_body') return `Welcome to our service, ${params?.name || ''}!`
			return `translated: ${key}`
		},
		getLocale: () => 'zh-TW',
		setLocale: () => {},
	}

	beforeEach(() => {
		mailerCalls = []
		eventDispatcher = new MemoryEventDispatcher(mockLogger)
		jobQueue = new MemoryJobQueueAdapter()
		sendWelcomeEmail = new SendWelcomeEmail(jobQueue, mockLogger, mockTranslator)
		sendWelcomeEmailJob = new SendWelcomeEmailJob(mockMailer, mockLogger, mockTranslator)

		// 註冊事件處理程序（使用事件名稱字符串）
		eventDispatcher.subscribe('UserCreated', sendWelcomeEmail.handle.bind(sendWelcomeEmail))

		// 註冊隊列工作處理程序
		jobQueue.process('user.send_welcome_email', sendWelcomeEmailJob.handle.bind(sendWelcomeEmailJob))
	})

	it('應該在 UserCreated 事件時推送工作到隊列', async () => {
		const event = new UserCreated('usr-123', 'John Doe', 'john@example.com', new Date())

		// 分發事件，觸發 Handler，推送工作到隊列
		await eventDispatcher.dispatch(event)

		// 驗證隊列中有工作
		expect(jobQueue.queueLength('user.send_welcome_email')).toBe(1)
		// 此時還未執行，所以郵件服務未被呼叫
		expect(mailerCalls.length).toBe(0)
	})

	it('應該在 SystemWorker 處理隊列時執行工作', async () => {
		const event = new UserCreated('usr-124', 'Jane Smith', 'jane@example.com', new Date())

		// 1. 分發事件（推送工作到隊列）
		await eventDispatcher.dispatch(event)
		expect(jobQueue.queueLength('user.send_welcome_email')).toBe(1)

		// 2. 模擬 SystemWorker 執行隊列
		await jobQueue.executeAll()

		// 3. 驗證郵件已發送
		expect(mailerCalls.length).toBe(1)
		expect(mailerCalls[0].to).toBe('jane@example.com')
		expect(mailerCalls[0].subject).toContain('Welcome')
		expect(mailerCalls[0].text).toContain('Welcome to our service')
	})

	it('應該正確傳遞郵件資料', async () => {
		const event = new UserCreated('usr-125', 'Alice Johnson', 'alice@example.com', new Date())

		await eventDispatcher.dispatch(event)
		await jobQueue.executeAll()

		expect(mailerCalls.length).toBe(1)
		const call = mailerCalls[0]
		expect(call.to).toBe('alice@example.com')
		expect(call.subject).toBe('Welcome Alice Johnson!')
		expect(call.text).toBe('Welcome to our service, Alice Johnson!')
	})

	it('應該在 Worker 執行前不發送郵件', async () => {
		const event = new UserCreated('usr-126', 'Bob Wilson', 'bob@example.com', new Date())

		// 只分發事件，不執行隊列
		await eventDispatcher.dispatch(event)

		// 驗證隊列中有工作但未執行
		expect(jobQueue.queueLength('user.send_welcome_email')).toBe(1)
		expect(mailerCalls.length).toBe(0)
	})

	it('應該支援多個事件和工作的順序執行', async () => {
		// 建立多個事件
		const event1 = new UserCreated('usr-127', 'User One', 'user1@example.com', new Date())
		const event2 = new UserCreated('usr-128', 'User Two', 'user2@example.com', new Date())
		const event3 = new UserCreated('usr-129', 'User Three', 'user3@example.com', new Date())

		// 分發所有事件
		await eventDispatcher.dispatch([event1, event2, event3])

		// 驗證所有工作都在隊列中
		expect(jobQueue.queueLength('user.send_welcome_email')).toBe(3)
		expect(mailerCalls.length).toBe(0)

		// 執行所有工作
		await jobQueue.executeAll()

		// 驗證所有郵件都已發送
		expect(mailerCalls.length).toBe(3)
		expect(mailerCalls[0].to).toBe('user1@example.com')
		expect(mailerCalls[1].to).toBe('user2@example.com')
		expect(mailerCalls[2].to).toBe('user3@example.com')
	})

	it('應該在隊列清空後無可執行的工作', async () => {
		const event = new UserCreated('usr-130', 'Clear Test', 'clear@example.com', new Date())

		await eventDispatcher.dispatch(event)
		expect(jobQueue.queueLength('user.send_welcome_email')).toBe(1)

		// 執行所有工作
		await jobQueue.executeAll()
		expect(jobQueue.queueLength('user.send_welcome_email')).toBe(0)

		// 再次執行（應該沒有工作）
		await jobQueue.executeAll()
		expect(mailerCalls.length).toBe(1) // 只有一封郵件
	})
})
