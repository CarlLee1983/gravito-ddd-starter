/**
 * @file SequentialSaga.ts
 * @description 序列 Saga 協調器實作
 *
 * 在 DDD 架構中的角色：
 * - Infrastructure Port 實現：實作 ISagaOrchestrator
 * - 職責：按序執行 Saga 步驟，失敗時逐步回滾
 *
 * 執行流程：
 * 1. 初始化 context（correlationId、results）
 * 2. 逐步執行所有步驟（步驟 i 的結果可被步驟 i+1 存取）
 * 3. 若任一步驟失敗，立即停止並進入補償流程
 * 4. 補償按倒序進行（最後執行的步驟最先補償）
 * 5. 返回最終 context（含成功/失敗狀態）
 *
 * @internal 此實現是基礎設施層細節
 */

import type { ISagaStep, ISagaOrchestrator, SagaContext } from '@/Foundation/Application/Sagas/ISaga'

/**
 * 序列 Saga 協調器
 *
 * 用於編排一系列按順序執行的、相互依賴的業務步驟。
 * 典型用例：電商購物流程（建立訂單 → 發起支付 → 確認訂單）
 *
 * @public
 */
export class SequentialSaga implements ISagaOrchestrator {
	/** 待執行的步驟序列 */
	private steps: ISagaStep[] = []

	/**
	 * 建構子
	 * @param steps - Saga 步驟陣列（已排序，按執行順序）
	 */
	constructor(steps: ISagaStep[]) {
		this.steps = steps
	}

	/**
	 * 執行 Saga
	 *
	 * @param input - Saga 輸入
	 * @param correlationId - 關聯 ID（不指定則自動生成）
	 * @returns Saga 執行結果上下文
	 */
	async execute(input: unknown, correlationId?: string): Promise<SagaContext> {
		const context: SagaContext = {
			correlationId: correlationId ?? crypto.randomUUID(),
			results: new Map(),
		}

		const executedSteps: ISagaStep[] = []

		try {
			// 1️⃣ 正向流程：依序執行所有步驟
			for (const step of this.steps) {
				try {
					const result = await step.execute(input, context)
					context.results.set(step.name, result)
					executedSteps.push(step)
				} catch (error) {
					// 步驟失敗，立即進入補償流程
					context.error = error instanceof Error ? error : new Error(String(error))
					throw context.error
				}
			}
		} catch (error) {
			// 2️⃣ 反向流程：補償所有已執行的步驟（倒序）
			await this.compensate(executedSteps, context)
		}

		return context
	}

	/**
	 * 補償流程
	 *
	 * 倒序執行所有已完成步驟的補償邏輯。
	 * 若補償失敗，記錄警告但繼續補償其他步驟（防止補償中斷）
	 *
	 * @param executedSteps - 已執行的步驟陣列（按執行順序）
	 * @param context - Saga 上下文
	 * @private
	 */
	private async compensate(executedSteps: ISagaStep[], context: SagaContext): Promise<void> {
		// 倒序補償：最後執行的步驟最先補償
		for (let i = executedSteps.length - 1; i >= 0; i--) {
			const step = executedSteps[i]
			try {
				await step.compensate(context)
			} catch (error) {
				// 補償失敗只記錄，不中斷後續補償
				const compensationError = error instanceof Error ? error : new Error(String(error))
				console.warn(
					`[SequentialSaga] 補償失敗 - 步驟: ${step.name}, 關聯ID: ${context.correlationId}, 原因: ${compensationError.message}`
				)
				// 補償失敗不更新 context.error，保持原始異常
			}
		}
	}
}
