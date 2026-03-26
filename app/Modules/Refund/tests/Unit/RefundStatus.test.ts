import { describe, it, expect } from 'bun:test'
import { RefundStatus } from '@/Modules/Refund/Domain/ValueObjects/RefundStatus'

describe('RefundStatus', () => {
	describe('靜態工廠方法', () => {
		it('requested() 建立 requested 狀態', () => {
			const status = RefundStatus.requested()
			expect(status.value).toBe('requested')
		})

		it('underReview() 建立 under_review 狀態', () => {
			const status = RefundStatus.underReview()
			expect(status.value).toBe('under_review')
		})

		it('approved() 建立 approved 狀態', () => {
			const status = RefundStatus.approved()
			expect(status.value).toBe('approved')
		})

		it('rejected() 建立 rejected 狀態', () => {
			const status = RefundStatus.rejected()
			expect(status.value).toBe('rejected')
		})

		it('awaitingReturn() 建立 awaiting_return 狀態', () => {
			const status = RefundStatus.awaitingReturn()
			expect(status.value).toBe('awaiting_return')
		})

		it('itemsReceived() 建立 items_received 狀態', () => {
			const status = RefundStatus.itemsReceived()
			expect(status.value).toBe('items_received')
		})

		it('processing() 建立 processing 狀態', () => {
			const status = RefundStatus.processing()
			expect(status.value).toBe('processing')
		})

		it('completed() 建立 completed 狀態', () => {
			const status = RefundStatus.completed()
			expect(status.value).toBe('completed')
		})

		it('failed() 建立 failed 狀態', () => {
			const status = RefundStatus.failed()
			expect(status.value).toBe('failed')
		})
	})

	describe('from() 工廠方法', () => {
		it('from() 接受合法字串並建立對應狀態', () => {
			expect(RefundStatus.from('requested').value).toBe('requested')
			expect(RefundStatus.from('under_review').value).toBe('under_review')
			expect(RefundStatus.from('approved').value).toBe('approved')
			expect(RefundStatus.from('rejected').value).toBe('rejected')
			expect(RefundStatus.from('awaiting_return').value).toBe('awaiting_return')
			expect(RefundStatus.from('items_received').value).toBe('items_received')
			expect(RefundStatus.from('processing').value).toBe('processing')
			expect(RefundStatus.from('completed').value).toBe('completed')
			expect(RefundStatus.from('failed').value).toBe('failed')
		})

		it('from() 對無效字串拋出錯誤', () => {
			expect(() => RefundStatus.from('invalid_status')).toThrow()
			expect(() => RefundStatus.from('')).toThrow()
			expect(() => RefundStatus.from('REQUESTED')).toThrow()
		})
	})

	describe('合法狀態轉換', () => {
		it('requested → under_review', () => {
			expect(RefundStatus.requested().canTransitionTo(RefundStatus.underReview())).toBe(true)
		})

		it('under_review → approved', () => {
			expect(RefundStatus.underReview().canTransitionTo(RefundStatus.approved())).toBe(true)
		})

		it('under_review → rejected', () => {
			expect(RefundStatus.underReview().canTransitionTo(RefundStatus.rejected())).toBe(true)
		})

		it('approved → awaiting_return', () => {
			expect(RefundStatus.approved().canTransitionTo(RefundStatus.awaitingReturn())).toBe(true)
		})

		it('approved → processing', () => {
			expect(RefundStatus.approved().canTransitionTo(RefundStatus.processing())).toBe(true)
		})

		it('awaiting_return → items_received', () => {
			expect(RefundStatus.awaitingReturn().canTransitionTo(RefundStatus.itemsReceived())).toBe(true)
		})

		it('items_received → processing', () => {
			expect(RefundStatus.itemsReceived().canTransitionTo(RefundStatus.processing())).toBe(true)
		})

		it('processing → completed', () => {
			expect(RefundStatus.processing().canTransitionTo(RefundStatus.completed())).toBe(true)
		})

		it('processing → failed', () => {
			expect(RefundStatus.processing().canTransitionTo(RefundStatus.failed())).toBe(true)
		})

		it('failed → processing（重試）', () => {
			expect(RefundStatus.failed().canTransitionTo(RefundStatus.processing())).toBe(true)
		})
	})

	describe('非法狀態轉換', () => {
		it('requested → completed 不允許', () => {
			expect(RefundStatus.requested().canTransitionTo(RefundStatus.completed())).toBe(false)
		})

		it('completed → processing 不允許（終態）', () => {
			expect(RefundStatus.completed().canTransitionTo(RefundStatus.processing())).toBe(false)
		})

		it('rejected → approved 不允許（終態）', () => {
			expect(RefundStatus.rejected().canTransitionTo(RefundStatus.approved())).toBe(false)
		})

		it('under_review → completed 不允許', () => {
			expect(RefundStatus.underReview().canTransitionTo(RefundStatus.completed())).toBe(false)
		})

		it('awaiting_return → completed 不允許', () => {
			expect(RefundStatus.awaitingReturn().canTransitionTo(RefundStatus.completed())).toBe(false)
		})
	})

	describe('isTerminal() 終態檢查', () => {
		it('completed 是終態', () => {
			expect(RefundStatus.completed().isTerminal()).toBe(true)
		})

		it('rejected 是終態', () => {
			expect(RefundStatus.rejected().isTerminal()).toBe(true)
		})

		it('processing 不是終態', () => {
			expect(RefundStatus.processing().isTerminal()).toBe(false)
		})

		it('requested 不是終態', () => {
			expect(RefundStatus.requested().isTerminal()).toBe(false)
		})

		it('failed 不是終態', () => {
			expect(RefundStatus.failed().isTerminal()).toBe(false)
		})
	})
})
