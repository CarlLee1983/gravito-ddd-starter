/**
 * @file ICartRepository.ts
 * @description 購物車倉儲介面 (Port)
 *
 * Domain 層定義的倉儲介面，不知道任何 ORM 或基礎設施細節
 */

import type { IRepository } from '@/Foundation/Domain/IRepository'
import type { Cart } from '../Aggregates/Cart'

/**
 * 購物車倉儲介面
 *
 * 定義購物車的持久化契約，所有實現必須遵循此介面
 */
export interface ICartRepository extends IRepository<Cart> {
	/**
	 * 根據使用者 ID 查找購物車
	 *
	 * @param userId - 使用者 ID
	 * @returns Promise 購物車或 null（若不存在）
	 */
	findByUserId(userId: string): Promise<Cart | null>

	/**
	 * 根據使用者 ID 查找或建立購物車
	 *
	 * 若購物車不存在，則自動建立新的購物車
	 *
	 * @param userId - 使用者 ID
	 * @returns Promise 購物車（若不存在則建立新的）
	 */
	findOrCreateByUserId(userId: string): Promise<Cart>
}
