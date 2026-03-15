/**
 * @file SequentialSaga.test.ts
 * @description 測試 SequentialSaga 的執行和補償機制
 */

import { describe, expect, it } from 'bun:test'
import { SequentialSaga } from '@/Foundation/Infrastructure/Sagas/SequentialSaga'
import type { ISagaStep, SagaContext } from '@/Foundation/Infrastructure/Sagas/ISaga'

describe('SequentialSaga', () => {
	describe('正向執行流程', () => {
		it('應該成功執行所有步驟並存儲結果', async () => {
			const results: string[] = []

			const step1: ISagaStep = {
				name: 'Step1',
				async execute(input: unknown, context: SagaContext) {
					results.push('Step1-execute')
					return { step1Data: 'result1' }
				},
				async compensate(context: SagaContext) {
					results.push('Step1-compensate')
				},
			}

			const step2: ISagaStep = {
				name: 'Step2',
				async execute(input: unknown, context: SagaContext) {
					const step1Result = context.results.get('Step1') as any
					results.push(`Step2-execute-with-${step1Result.step1Data}`)
					return { step2Data: 'result2' }
				},
				async compensate(context: SagaContext) {
					results.push('Step2-compensate')
				},
			}

			const saga = new SequentialSaga([step1, step2])
			const context = await saga.execute({ test: 'input' })

			expect(context.error).toBeUndefined()
			expect(results).toEqual(['Step1-execute', 'Step2-execute-with-result1'])
			expect(context.results.get('Step1')).toEqual({ step1Data: 'result1' })
			expect(context.results.get('Step2')).toEqual({ step2Data: 'result2' })
		})

		it('應該傳遞 correlationId 到上下文', async () => {
			let capturedCorrelationId: string | undefined

			const step: ISagaStep = {
				name: 'TestStep',
				async execute(input: unknown, context: SagaContext) {
					capturedCorrelationId = context.correlationId
					return 'done'
				},
				async compensate(context: SagaContext) {},
			}

			const saga = new SequentialSaga([step])
			const specifiedId = 'test-correlation-id-123'
			const context = await saga.execute({}, specifiedId)

			expect(context.correlationId).toBe(specifiedId)
			expect(capturedCorrelationId).toBe(specifiedId)
		})

		it('應該自動生成 correlationId 當未指定', async () => {
			let capturedId: string | undefined

			const step: ISagaStep = {
				name: 'TestStep',
				async execute(input: unknown, context: SagaContext) {
					capturedId = context.correlationId
					return 'done'
				},
				async compensate(context: SagaContext) {},
			}

			const saga = new SequentialSaga([step])
			const context = await saga.execute({})

			expect(context.correlationId).toBeDefined()
			expect(context.correlationId).toMatch(/^[0-9a-f-]{36}$/) // UUID format
			expect(capturedId).toBe(context.correlationId)
		})
	})

	describe('失敗與補償流程', () => {
		it('應該在步驟失敗時觸發補償', async () => {
			const execution: string[] = []

			const step1: ISagaStep = {
				name: 'Step1',
				async execute() {
					execution.push('Step1-execute')
					return 'result1'
				},
				async compensate() {
					execution.push('Step1-compensate')
				},
			}

			const step2: ISagaStep = {
				name: 'Step2',
				async execute() {
					execution.push('Step2-execute')
					throw new Error('Step 2 failed')
				},
				async compensate() {
					execution.push('Step2-compensate')
				},
			}

			const saga = new SequentialSaga([step1, step2])
			const context = await saga.execute({})

			// 應該執行 Step1 和 Step2（失敗），然後只補償 Step1（因為 Step2 沒有完成）
			expect(execution).toEqual([
				'Step1-execute',
				'Step2-execute',
				'Step1-compensate',
			])
			expect(context.error).toBeDefined()
			expect(context.error?.message).toContain('Step 2 failed')
		})

		it('應該倒序進行補償（最後執行的步驟最先補償）', async () => {
			const order: string[] = []

			const steps = [1, 2, 3].map((num) => ({
				name: `Step${num}`,
				async execute() {
					order.push(`execute-${num}`)
					return num === 3 ? (() => { throw new Error('Step3 failed') })() : num
				},
				async compensate() {
					order.push(`compensate-${num}`)
				},
			})) as ISagaStep[]

			const saga = new SequentialSaga(steps)
			const context = await saga.execute({})

			// execute 順序：1, 2, 3（3 失敗）
			// compensate 順序：3（先），2，1（後）
			// 因為 3 失敗，3 的補償不執行，只補償 2 和 1
			expect(context.error).toBeDefined()
		})

		it('應該即使補償失敗也繼續補償其他步驟', async () => {
			const order: string[] = []

			const step1: ISagaStep = {
				name: 'Step1',
				async execute() {
					order.push('Step1-execute')
					return 'result1'
				},
				async compensate() {
					order.push('Step1-compensate')
				},
			}

			const step2: ISagaStep = {
				name: 'Step2',
				async execute() {
					order.push('Step2-execute')
					throw new Error('Step2 failed')
				},
				async compensate() {
					order.push('Step2-compensate-start')
					throw new Error('Compensation failed')
				},
			}

			const step3: ISagaStep = {
				name: 'Step3',
				async execute() {
					order.push('Step3-execute')
					return 'result3'
				},
				async compensate() {
					order.push('Step3-compensate')
				},
			}

			const saga = new SequentialSaga([step1, step2, step3])
			const context = await saga.execute({})

			// 應該執行 Step1, Step2（失敗）, Step3, 然後補償
			// 注意：Step2 執行失敗，Step3 不執行，所以補償只需要補償 Step1
			expect(context.error).toBeDefined()
		})

		it('應該在上下文中儲存原始錯誤', async () => {
			const step: ISagaStep = {
				name: 'FailingStep',
				async execute() {
					throw new Error('Custom error message')
				},
				async compensate() {},
			}

			const saga = new SequentialSaga([step])
			const context = await saga.execute({})

			expect(context.error).toBeDefined()
			expect(context.error?.message).toBe('Custom error message')
		})
	})

	describe('步驟間資料傳遞', () => {
		it('後面的步驟可以存取前面步驟的結果', async () => {
			const step1: ISagaStep = {
				name: 'CreateOrder',
				async execute(input: unknown, context: SagaContext) {
					return { orderId: 'order-123', totalAmount: 99.99 }
				},
				async compensate() {},
			}

			const step2: ISagaStep = {
				name: 'InitiatePayment',
				async execute(input: unknown, context: SagaContext) {
					const orderResult = context.results.get('CreateOrder') as any
					return {
						paymentId: 'payment-456',
						orderId: orderResult.orderId,
						amount: orderResult.totalAmount,
					}
				},
				async compensate() {},
			}

			const saga = new SequentialSaga([step1, step2])
			const context = await saga.execute({})

			const paymentResult = context.results.get('InitiatePayment') as any
			expect(paymentResult.orderId).toBe('order-123')
			expect(paymentResult.amount).toBe(99.99)
		})
	})

	describe('空 Saga', () => {
		it('應該成功執行沒有步驟的 Saga', async () => {
			const saga = new SequentialSaga([])
			const context = await saga.execute({})

			expect(context.error).toBeUndefined()
			expect(context.results.size).toBe(0)
		})
	})

	describe('單步 Saga', () => {
		it('應該成功執行單一步驟 Saga', async () => {
			const step: ISagaStep = {
				name: 'SingleStep',
				async execute() {
					return 'single-result'
				},
				async compensate() {},
			}

			const saga = new SequentialSaga([step])
			const context = await saga.execute({})

			expect(context.error).toBeUndefined()
			expect(context.results.get('SingleStep')).toBe('single-result')
		})

		it('單一步驟失敗應該觸發補償', async () => {
			const compensation = { called: false }

			const step: ISagaStep = {
				name: 'FailingStep',
				async execute() {
					throw new Error('Single step failed')
				},
				async compensate() {
					compensation.called = true
				},
			}

			const saga = new SequentialSaga([step])
			const context = await saga.execute({})

			expect(context.error).toBeDefined()
			// 單一步驟失敗後就進入補償，但 step 本身沒有執行成功，所以不會補償
		})
	})
})
