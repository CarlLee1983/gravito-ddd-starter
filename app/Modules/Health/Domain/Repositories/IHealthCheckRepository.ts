/**
 * @file IHealthCheckRepository.ts
 * @description 健康檢查模組的倉儲介面定義
 */

import type { IRepository } from '@/Foundation/Domain/IRepository'
import { HealthCheck } from '../Aggregates/HealthCheck'

/**
 * IHealthCheckRepository 介面
 */
export interface IHealthCheckRepository extends IRepository<HealthCheck> {
  /**
   * 根據唯一識別符尋找記錄
   * 
   * @param id - 記錄 ID
   * @returns Promise 包含聚合根或 null
   */
  findById(id: string): Promise<HealthCheck | null>

  /**
   * 獲取最後一次執行的健康檢查記錄
   * 
   * @returns Promise 包含最新的 HealthCheck 聚合根
   */
  findLatest(): Promise<HealthCheck | null>

  /**
   * 獲取健康檢查歷史記錄 (支援分頁限制)
   *
   * @param params - 分頁參數
   * @returns Promise 包含聚合根陣列
   */
  findAll(params?: { limit?: number; offset?: number }): Promise<HealthCheck[]>

  /**
   * 保存健康檢查記錄 (新增或更新)
   * 
   * @param check - 要保存的聚合根實例
   * @returns Promise<void>
   */
  save(check: HealthCheck): Promise<void>

  /**
   * 刪除指定天數以前的舊記錄
   * 
   * @param days - 指定天數
   * @returns Promise 包含成功刪除的記錄數量
   */
  deleteOlderThan(days: number): Promise<number>
}
