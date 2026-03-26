/**
 * @file MemoryProjectionCheckpointStore.ts
 * @description 記憶體實現的投影檢查點儲存
 *
 * 使用 Map 儲存各投影器的 Checkpoint，適用於開發與測試環境。
 * 生產環境應使用持久化實現（如 Redis 或資料庫）。
 */

import type { ProjectionCheckpoint } from '../../Application/Ports/IProjector'
import type { IProjectionCheckpointStore } from '../../Application/Ports/IProjectionCheckpointStore'

export type { IProjectionCheckpointStore }

/**
 * 記憶體投影檢查點儲存
 *
 * 簡單的 Map 實現，用於開發和測試。
 */
export class MemoryProjectionCheckpointStore implements IProjectionCheckpointStore {
	private readonly checkpoints = new Map<string, ProjectionCheckpoint>()

	async save(checkpoint: ProjectionCheckpoint): Promise<void> {
		this.checkpoints.set(checkpoint.projectorName, { ...checkpoint })
	}

	async get(projectorName: string): Promise<ProjectionCheckpoint | null> {
		const checkpoint = this.checkpoints.get(projectorName)
		if (!checkpoint) return null
		return { ...checkpoint }
	}

	async delete(projectorName: string): Promise<void> {
		this.checkpoints.delete(projectorName)
	}
}
