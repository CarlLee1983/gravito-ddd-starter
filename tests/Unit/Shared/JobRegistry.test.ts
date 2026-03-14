/**
 * @file JobRegistry.test.ts
 * @description JobRegistry 單元測試
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { JobRegistry } from '@/Foundation/Infrastructure/Registries/JobRegistry'
import type { IJobQueue } from '@/Foundation/Infrastructure/Ports/Messaging/IJobQueue'
import type { IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import { BaseJob } from '@/Foundation/Application/Jobs/BaseJob'

// 簡單的 Mock Job
class MockJob extends BaseJob {
	readonly jobName = 'test.job'
	async handle(data: any): Promise<void> {
		// Mock implementation
	}
}

describe('JobRegistry', () => {
	beforeEach(() => {
		// 清空 Registry 以確保測試隔離
		JobRegistry.clear()
	})

	it('should register module jobs', () => {
		JobRegistry.register({
			moduleName: 'User',
			jobs: [
				{
					jobName: 'user.send_email',
					jobFactory: () => new MockJob(),
				},
			],
		})

		const userJobs = JobRegistry.getByModule('User')
		expect(userJobs).toBeDefined()
		expect(userJobs?.jobs.length).toBe(1)
		expect(userJobs?.jobs[0].jobName).toBe('user.send_email')
	})

	it('should merge jobs from same module', () => {
		JobRegistry.register({
			moduleName: 'User',
			jobs: [
				{
					jobName: 'user.send_email',
					jobFactory: () => new MockJob(),
				},
			],
		})

		JobRegistry.register({
			moduleName: 'User',
			jobs: [
				{
					jobName: 'user.send_sms',
					jobFactory: () => new MockJob(),
				},
			],
		})

		const userJobs = JobRegistry.getByModule('User')
		expect(userJobs?.jobs.length).toBe(2)
	})

	it('should retrieve all jobs', () => {
		JobRegistry.register({
			moduleName: 'User',
			jobs: [
				{
					jobName: 'user.send_email',
					jobFactory: () => new MockJob(),
				},
			],
		})

		JobRegistry.register({
			moduleName: 'Post',
			jobs: [
				{
					jobName: 'post.publish',
					jobFactory: () => new MockJob(),
				},
			],
		})

		const allJobs = JobRegistry.getAll()
		expect(allJobs.length).toBe(2)
		expect(allJobs.map((j) => j.moduleName)).toContain('User')
		expect(allJobs.map((j) => j.moduleName)).toContain('Post')
	})

	it('should bind jobs to queue', async () => {
		let processHandlerCalled = false

		const mockJobQueue: IJobQueue = {
			push: async () => {},
			process: (name: string, handler) => {
				// Test that process is called
				processHandlerCalled = true
			},
		}

		const mockContainer: IContainer = {
			singleton: () => {},
			bind: () => {},
			make: () => new MockJob(),
		}

		JobRegistry.register({
			moduleName: 'User',
			jobs: [
				{
					jobName: 'user.send_email',
					jobFactory: (c) => c.make('job'),
				},
			],
		})

		JobRegistry.bindAll(mockJobQueue, mockContainer)
		expect(processHandlerCalled).toBe(true)
	})

	it('should handle binding errors gracefully', () => {
		const mockJobQueue: IJobQueue = {
			push: async () => {},
			process: () => {
				throw new Error('Process failed')
			},
		}

		const mockContainer: IContainer = {
			singleton: () => {},
			bind: () => {},
			make: () => new MockJob(),
		}

		JobRegistry.register({
			moduleName: 'User',
			jobs: [
				{
					jobName: 'user.send_email',
					jobFactory: () => new MockJob(),
				},
			],
		})

		// Should not throw, errors should be logged
		expect(() => {
			JobRegistry.bindAll(mockJobQueue, mockContainer)
		}).not.toThrow()
	})

	it('should clear all jobs', () => {
		JobRegistry.register({
			moduleName: 'User',
			jobs: [
				{
					jobName: 'user.send_email',
					jobFactory: () => new MockJob(),
				},
			],
		})

		JobRegistry.clear()
		const allJobs = JobRegistry.getAll()
		expect(allJobs.length).toBe(0)
	})
})
