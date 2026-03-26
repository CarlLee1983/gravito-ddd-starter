/**
 * @file IProjectionCheckpointStore.ts
 * @description 投影檢查點儲存介面（Port）
 *
 * 管理投影器的執行進度（Checkpoint），支援斷點續傳。
 *
 * **DDD 角色**
 * - 應用層：Application Port
 * - 職責：持久化投影進度
 * - 使用場景：CQRS 投影重建、斷點續傳
 */

import type { ProjectionCheckpoint } from './IProjector'

/**
 * 投影檢查點儲存介面
 */
export interface IProjectionCheckpointStore {
	save(checkpoint: ProjectionCheckpoint): Promise<void>
	get(projectorName: string): Promise<ProjectionCheckpoint | null>
	delete(projectorName: string): Promise<void>
}
