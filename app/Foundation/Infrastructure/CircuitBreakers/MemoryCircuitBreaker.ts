/**
 * @file MemoryCircuitBreaker.ts
 * @description 記憶體熔斷器實現
 *
 * 三態狀態機：CLOSED -> OPEN -> HALF_OPEN -> CLOSED
 * 用於保護應用免受外部服務故障影響。
 */

import type {
	CircuitBreakerConfig,
	CircuitBreakerState,
	ICircuitBreaker,
} from '@/Foundation/Infrastructure/Ports/Services/ICircuitBreaker'
import { CircuitBreakerOpenException } from '@/Foundation/Infrastructure/Ports/Services/ICircuitBreaker'

const DEFAULT_FAILURE_THRESHOLD = 5
const DEFAULT_SUCCESS_THRESHOLD = 2
const DEFAULT_TIMEOUT = 60000

export class MemoryCircuitBreaker implements ICircuitBreaker {
	private state: CircuitBreakerState = 'CLOSED'
	private failureCount = 0
	private successCount = 0
	private openedAt: number | null = null

	private readonly failureThreshold: number
	private readonly successThreshold: number
	private readonly timeout: number

	constructor(config: CircuitBreakerConfig = {}) {
		this.failureThreshold = config.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD
		this.successThreshold = config.successThreshold ?? DEFAULT_SUCCESS_THRESHOLD
		this.timeout = config.timeout ?? DEFAULT_TIMEOUT
	}

	async execute<T>(fn: () => Promise<T>): Promise<T> {
		if (this.state === 'OPEN') {
			if (this.isTimeoutExpired()) {
				this.transitionTo('HALF_OPEN')
			} else {
				throw new CircuitBreakerOpenException()
			}
		}

		try {
			const result = await fn()
			this.onSuccess()
			return result
		} catch (error) {
			this.onFailure()
			throw error
		}
	}

	getState(): CircuitBreakerState {
		return this.state
	}

	reset(): void {
		this.state = 'CLOSED'
		this.failureCount = 0
		this.successCount = 0
		this.openedAt = null
	}

	private onSuccess(): void {
		if (this.state === 'HALF_OPEN') {
			this.successCount++
			if (this.successCount >= this.successThreshold) {
				this.transitionTo('CLOSED')
			}
		} else if (this.state === 'CLOSED') {
			this.failureCount = 0
		}
	}

	private onFailure(): void {
		if (this.state === 'HALF_OPEN') {
			this.transitionTo('OPEN')
		} else if (this.state === 'CLOSED') {
			this.failureCount++
			if (this.failureCount >= this.failureThreshold) {
				this.transitionTo('OPEN')
			}
		}
	}

	private transitionTo(newState: CircuitBreakerState): void {
		this.state = newState

		if (newState === 'OPEN') {
			this.openedAt = Date.now()
			this.successCount = 0
		} else if (newState === 'HALF_OPEN') {
			this.successCount = 0
		} else if (newState === 'CLOSED') {
			this.failureCount = 0
			this.successCount = 0
			this.openedAt = null
		}
	}

	private isTimeoutExpired(): boolean {
		if (this.openedAt === null) return false
		return Date.now() - this.openedAt >= this.timeout
	}
}
