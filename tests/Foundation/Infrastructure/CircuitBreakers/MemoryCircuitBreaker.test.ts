import { describe, expect, it, beforeEach } from 'bun:test'
import { MemoryCircuitBreaker } from '@/Foundation/Infrastructure/CircuitBreakers/MemoryCircuitBreaker'
import { CircuitBreakerOpenException } from '@/Foundation/Infrastructure/Ports/Services/ICircuitBreaker'

describe('MemoryCircuitBreaker', () => {
	let cb: MemoryCircuitBreaker

	const succeed = async () => 'ok'
	const fail = async () => {
		throw new Error('service error')
	}

	// 輔助函式：連續失敗 n 次
	async function failTimes(breaker: MemoryCircuitBreaker, n: number) {
		for (let i = 0; i < n; i++) {
			try {
				await breaker.execute(fail)
			} catch {
				// 預期失敗
			}
		}
	}

	beforeEach(() => {
		cb = new MemoryCircuitBreaker({
			failureThreshold: 3,
			successThreshold: 2,
			timeout: 100,
		})
	})

	// ============================================================
	// 單元測試 (8 個)：狀態轉換、計數邏輯
	// ============================================================

	describe('CLOSED 狀態', () => {
		it('初始狀態為 CLOSED', () => {
			expect(cb.getState()).toBe('CLOSED')
		})

		it('成功執行時保持 CLOSED 並返回結果', async () => {
			const result = await cb.execute(succeed)
			expect(result).toBe('ok')
			expect(cb.getState()).toBe('CLOSED')
		})

		it('失敗未達閾值時保持 CLOSED', async () => {
			await failTimes(cb, 2)
			expect(cb.getState()).toBe('CLOSED')
		})

		it('失敗達到閾值時轉為 OPEN', async () => {
			await failTimes(cb, 3)
			expect(cb.getState()).toBe('OPEN')
		})

		it('成功後重置失敗計數', async () => {
			await failTimes(cb, 2)
			await cb.execute(succeed)
			// 再失敗 2 次不應轉 OPEN（因為計數已重置）
			await failTimes(cb, 2)
			expect(cb.getState()).toBe('CLOSED')
		})
	})

	describe('OPEN 狀態', () => {
		it('OPEN 時拒絕請求並拋出 CircuitBreakerOpenException', async () => {
			await failTimes(cb, 3)
			expect(cb.getState()).toBe('OPEN')

			expect(cb.execute(succeed)).rejects.toBeInstanceOf(CircuitBreakerOpenException)
		})

		it('timeout 過期後轉為 HALF_OPEN 並允許執行', async () => {
			await failTimes(cb, 3)
			expect(cb.getState()).toBe('OPEN')

			// 模擬 timeout 過期
			await new Promise((resolve) => setTimeout(resolve, 120))

			const result = await cb.execute(succeed)
			expect(result).toBe('ok')
			expect(cb.getState()).toBe('HALF_OPEN')
		})
	})

	describe('HALF_OPEN 狀態', () => {
		async function enterHalfOpen() {
			await failTimes(cb, 3)
			await new Promise((resolve) => setTimeout(resolve, 120))
			// 第一次成功讓它進入 HALF_OPEN
			await cb.execute(succeed)
			expect(cb.getState()).toBe('HALF_OPEN')
		}

		it('成功達到閾值後轉回 CLOSED', async () => {
			await enterHalfOpen()
			// enterHalfOpen 已計算 1 次成功，再 1 次達到 successThreshold=2
			await cb.execute(succeed)
			expect(cb.getState()).toBe('CLOSED')
		})

		it('任何失敗立即轉回 OPEN', async () => {
			await enterHalfOpen()

			try {
				await cb.execute(fail)
			} catch {
				// 預期失敗
			}

			expect(cb.getState()).toBe('OPEN')
		})
	})

	describe('reset()', () => {
		it('強制重置為 CLOSED 且清除所有計數', async () => {
			await failTimes(cb, 3)
			expect(cb.getState()).toBe('OPEN')

			cb.reset()
			expect(cb.getState()).toBe('CLOSED')

			// 可以正常執行
			const result = await cb.execute(succeed)
			expect(result).toBe('ok')
		})
	})

	// ============================================================
	// 並發行為測試 (5 個)：多線程/非同步安全
	// ============================================================

	describe('並發行為', () => {
		it('多個並發成功請求在 CLOSED 狀態下正常執行', async () => {
			const results = await Promise.all([
				cb.execute(succeed),
				cb.execute(succeed),
				cb.execute(succeed),
			])
			expect(results).toEqual(['ok', 'ok', 'ok'])
			expect(cb.getState()).toBe('CLOSED')
		})

		it('多個並發失敗能正確累計計數並轉為 OPEN', async () => {
			const promises = Array.from({ length: 5 }, () =>
				cb.execute(fail).catch(() => 'caught'),
			)
			await Promise.all(promises)
			expect(cb.getState()).toBe('OPEN')
		})

		it('OPEN 狀態下多個並發請求全部被拒絕', async () => {
			await failTimes(cb, 3)
			expect(cb.getState()).toBe('OPEN')

			const results = await Promise.allSettled([
				cb.execute(succeed),
				cb.execute(succeed),
				cb.execute(succeed),
			])

			for (const result of results) {
				expect(result.status).toBe('rejected')
				if (result.status === 'rejected') {
					expect(result.reason).toBeInstanceOf(CircuitBreakerOpenException)
				}
			}
		})

		it('HALF_OPEN 狀態下並發成功請求能正確轉為 CLOSED', async () => {
			await failTimes(cb, 3)
			await new Promise((resolve) => setTimeout(resolve, 120))

			// 並發執行多個成功請求
			const results = await Promise.all([
				cb.execute(succeed),
				cb.execute(succeed),
				cb.execute(succeed),
			])

			expect(results).toEqual(['ok', 'ok', 'ok'])
			expect(cb.getState()).toBe('CLOSED')
		})

		it('混合成功和失敗的並發請求正確處理', async () => {
			const slowFail = async () => {
				await new Promise((resolve) => setTimeout(resolve, 10))
				throw new Error('slow fail')
			}

			// 2 次失敗（未達閾值 3）
			const results = await Promise.allSettled([
				cb.execute(succeed),
				cb.execute(slowFail),
				cb.execute(succeed),
				cb.execute(slowFail),
			])

			const fulfilled = results.filter((r) => r.status === 'fulfilled').length
			const rejected = results.filter((r) => r.status === 'rejected').length

			expect(fulfilled).toBe(2)
			expect(rejected).toBe(2)
			// 失敗計數可能為 2（未達閾值 3），狀態應為 CLOSED
			expect(cb.getState()).toBe('CLOSED')
		})
	})
})
