/**
 * @file IUserQueryService.ts
 * @description 用戶查詢服務介面 (CQRS 讀側介面)
 *
 * 職責：定義專屬於用戶模組的查詢操作，繼承自基礎的 IQuerySide。
 */

import type { IQuerySide } from '@/Foundation/Application/IQuerySide'
import type { UserReadModel } from '../ReadModels/UserReadModel'

/**
 * 用戶查詢服務介面
 */
export interface IUserQueryService extends IQuerySide<UserReadModel> {
  /**
   * 根據電子郵件查詢用戶 ReadModel
   * @param email - 電子郵件字串
   */
  findByEmail(email: string): Promise<UserReadModel | null>
}
