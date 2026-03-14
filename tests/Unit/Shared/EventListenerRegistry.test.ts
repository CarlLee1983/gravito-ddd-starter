/**
 * @file EventListenerRegistry.test.ts
 * @description EventListenerRegistry 單元測試
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { EventListenerRegistry } from '@/Foundation/Infrastructure/Registries/EventListenerRegistry'
import type { IEventDispatcher } from '@/Foundation/Infrastructure/Ports/Messaging/IEventDispatcher'
import type { IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'

describe('EventListenerRegistry', () => {
	beforeEach(() => {
		// 清空 Registry 以確保測試隔離
		EventListenerRegistry.clear()
	})

	it('should register module listeners', () => {
		EventListenerRegistry.register({
			moduleName: 'User',
			listeners: [
				{
					eventName: 'UserCreated',
					handlerFactory: () => async () => {
						// dummy handler
					},
				},
			],
		})

		const userListeners = EventListenerRegistry.getByModule('User')
		expect(userListeners).toBeDefined()
		expect(userListeners?.listeners.length).toBe(1)
		expect(userListeners?.listeners[0].eventName).toBe('UserCreated')
	})

	it('should merge listeners from same module', () => {
		EventListenerRegistry.register({
			moduleName: 'User',
			listeners: [
				{
					eventName: 'UserCreated',
					handlerFactory: () => async () => {
						// dummy handler
					},
				},
			],
		})

		EventListenerRegistry.register({
			moduleName: 'User',
			listeners: [
				{
					eventName: 'UserUpdated',
					handlerFactory: () => async () => {
						// dummy handler
					},
				},
			],
		})

		const userListeners = EventListenerRegistry.getByModule('User')
		expect(userListeners?.listeners.length).toBe(2)
	})

	it('should retrieve all listeners', () => {
		EventListenerRegistry.register({
			moduleName: 'User',
			listeners: [
				{
					eventName: 'UserCreated',
					handlerFactory: () => async () => {},
				},
			],
		})

		EventListenerRegistry.register({
			moduleName: 'Post',
			listeners: [
				{
					eventName: 'PostCreated',
					handlerFactory: () => async () => {},
				},
			],
		})

		const allListeners = EventListenerRegistry.getAll()
		expect(allListeners.length).toBe(2)
		expect(allListeners.map((l) => l.moduleName)).toContain('User')
		expect(allListeners.map((l) => l.moduleName)).toContain('Post')
	})

	it('should bind listeners to dispatcher', async () => {
		let handlerCalled = false
		const mockHandler = async () => {
			handlerCalled = true
		}

		const mockDispatcher: IEventDispatcher = {
			dispatch: async () => {},
			subscribe: (eventName: string, handler) => {
				// Call the handler immediately to test binding
				handler({})
			},
		}

		const mockContainer: IContainer = {
			singleton: () => {},
			bind: () => {},
			make: () => mockHandler,
		}

		EventListenerRegistry.register({
			moduleName: 'User',
			listeners: [
				{
					eventName: 'UserCreated',
					handlerFactory: () => mockHandler,
				},
			],
		})

		EventListenerRegistry.bindAll(mockDispatcher, mockContainer)
		expect(handlerCalled).toBe(true)
	})

	it('should handle binding errors gracefully', () => {
		const mockDispatcher: IEventDispatcher = {
			dispatch: async () => {},
			subscribe: () => {
				throw new Error('Subscribe failed')
			},
		}

		const mockContainer: IContainer = {
			singleton: () => {},
			bind: () => {},
			make: () => async () => {},
		}

		EventListenerRegistry.register({
			moduleName: 'User',
			listeners: [
				{
					eventName: 'UserCreated',
					handlerFactory: () => async () => {},
				},
			],
		})

		// Should not throw, errors should be logged
		expect(() => {
			EventListenerRegistry.bindAll(mockDispatcher, mockContainer)
		}).not.toThrow()
	})

	it('should clear all listeners', () => {
		EventListenerRegistry.register({
			moduleName: 'User',
			listeners: [
				{
					eventName: 'UserCreated',
					handlerFactory: () => async () => {},
				},
			],
		})

		EventListenerRegistry.clear()
		const allListeners = EventListenerRegistry.getAll()
		expect(allListeners.length).toBe(0)
	})
})
