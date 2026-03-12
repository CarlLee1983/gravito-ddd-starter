/**
 * @file SendWelcomeEmailJob.test.ts
 * @description SendWelcomeEmailJob 單元測試
 */

import { describe, it, expect } from 'bun:test'
import { SendWelcomeEmailJob, type SendWelcomeEmailData } from '@/Modules/User/Application/Jobs/SendWelcomeEmailJob'
import type { IMailer } from '@/Shared/Infrastructure/IMailer'
import type { ILogger } from '@/Shared/Infrastructure/ILogger'
import type { ITranslator } from '@/Shared/Infrastructure/ITranslator'

describe('SendWelcomeEmailJob', () => {
	it('should have correct job name', () => {
		const mockMailer: IMailer = {
			send: async () => {},
			queue: async () => {},
		}
		const mockLogger: ILogger = {
			debug: () => {},
			info: () => {},
			warn: () => {},
			error: () => {},
		}
		const mockTranslator: ITranslator = {
			trans: (key: string) => `translated: ${key}`,
		}

		const job = new SendWelcomeEmailJob(mockMailer, mockLogger, mockTranslator)
		expect(job.jobName).toBe('user.send_welcome_email')
	})

	it('should have correct retry configuration', () => {
		const mockMailer: IMailer = {
			send: async () => {},
			queue: async () => {},
		}
		const mockLogger: ILogger = {
			debug: () => {},
			info: () => {},
			warn: () => {},
			error: () => {},
		}
		const mockTranslator: ITranslator = {
			trans: (key: string) => `translated: ${key}`,
		}

		const job = new SendWelcomeEmailJob(mockMailer, mockLogger, mockTranslator)
		expect(job.tries).toBe(3)
		expect(job.backoff).toBe(60)
		expect(job.delay).toBe(0)
	})

	it('should generate correct job meta', () => {
		const mockMailer: IMailer = {
			send: async () => {},
			queue: async () => {},
		}
		const mockLogger: ILogger = {
			debug: () => {},
			info: () => {},
			warn: () => {},
			error: () => {},
		}
		const mockTranslator: ITranslator = {
			trans: (key: string) => `translated: ${key}`,
		}

		const job = new SendWelcomeEmailJob(mockMailer, mockLogger, mockTranslator)
		const meta = job.toJobMeta()

		expect(meta.jobName).toBe('user.send_welcome_email')
		expect(meta.tries).toBe(3)
		expect(meta.backoff).toBe(60)
		expect(meta.delay).toBe(0)
	})

	it('should generate correct job payload', () => {
		const mockMailer: IMailer = {
			send: async () => {},
			queue: async () => {},
		}
		const mockLogger: ILogger = {
			debug: () => {},
			info: () => {},
			warn: () => {},
			error: () => {},
		}
		const mockTranslator: ITranslator = {
			trans: (key: string) => `translated: ${key}`,
		}

		const job = new SendWelcomeEmailJob(mockMailer, mockLogger, mockTranslator)
		const data: SendWelcomeEmailData = {
			userId: 'usr-123',
			name: 'John Doe',
			email: 'john@example.com',
		}

		const payload = job.toJobPayload(data)

		expect(payload.meta.jobName).toBe('user.send_welcome_email')
		expect(payload.data.userId).toBe('usr-123')
		expect(payload.data.name).toBe('John Doe')
		expect(payload.data.email).toBe('john@example.com')
		expect(payload.attempt).toBe(1)
		expect(payload.enqueuedAt).toBeDefined()
	})

	it('should handle email sending', async () => {
		let sendCalled = false
		let sendEmail = ''

		const mockMailer: IMailer = {
			send: async (options) => {
				sendCalled = true
				sendEmail = typeof options.to === 'string' ? options.to : options.to[0]
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
			trans: (key: string) => {
				if (key === 'user.welcome_subject') return 'Welcome!'
				if (key === 'user.welcome_body') return 'Welcome to our service'
				return `translated: ${key}`
			},
		}

		const job = new SendWelcomeEmailJob(mockMailer, mockLogger, mockTranslator)
		const data: SendWelcomeEmailData = {
			userId: 'usr-123',
			name: 'John Doe',
			email: 'john@example.com',
		}

		await job.handle(data)

		expect(sendCalled).toBe(true)
		expect(sendEmail).toBe('john@example.com')
	})

	it('should throw on email send failure', async () => {
		const mockMailer: IMailer = {
			send: async () => {
				throw new Error('Email service unavailable')
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
			trans: (key: string) => `translated: ${key}`,
		}

		const job = new SendWelcomeEmailJob(mockMailer, mockLogger, mockTranslator)
		const data: SendWelcomeEmailData = {
			userId: 'usr-123',
			name: 'John Doe',
			email: 'john@example.com',
		}

		try {
			await job.handle(data)
			expect.unreachable('Should throw error')
		} catch (error) {
			expect(error instanceof Error).toBe(true)
			expect((error as Error).message).toContain('Email service unavailable')
		}
	})
})
