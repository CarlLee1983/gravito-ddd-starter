/**
 * @file IPostRepository.ts
 * @description 定義 Post 模組的資料倉儲介面 (Repository Interface)
 * @module src/Modules/Post/Domain/Repositories
 */

import type { IRepository } from '@/Shared/Domain/IRepository'

/**
 * IPostRepository 介面
 * 
 * 在 DDD 架構中屬於「領域層 (Domain Layer)」。
 * 定義了對 Post 聚合根進行持久化操作的契約。
 * 
 * 依照依賴反轉原則 (DIP)：
 * - 領域層定義介面 (Port)。
 * - 基礎設施層實現該介面 (Adapter)。
 * 
 * 這使得領域邏輯可以獨立於具體的資料庫技術 (如 Atlas, Drizzle, Memory 等)。
 */
export interface IPostRepository extends IRepository<any> {
	// 基礎 CRUD 操作由 IRepository 提供：
	// - save(entity: any): Promise<void>
	// - findById(id: string): Promise<any | null>
	// - delete(id: string): Promise<void>
	// - findAll(params?): Promise<any[]>
	// - count(params?): Promise<number>

	// 業務相關方法可在此添加
	// 例如：
	// findByTitle(title: string): Promise<Post | null>
	// findByAuthor(authorId: string): Promise<Post[]>
}
