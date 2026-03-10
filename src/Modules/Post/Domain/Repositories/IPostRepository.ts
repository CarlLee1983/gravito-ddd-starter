/**
 * Post 資料倉儲介面
 *
 * @public - Domain 層定義的公開介面，所有層都可使用
 *
 * 定義了應用層與資料層的契約。
 * Application 層只知道這個介面，不知道底層是 Atlas、Drizzle 還是其他 ORM。
 *
 * **分層設計**
 * - 定義位置：Domain 層（此檔案）
 * - 實現位置：Infrastructure 層（PostRepository）
 * - 消費者：Application 層 Service、Controller
 *
 * **依賴反轉**
 * Application → IPostRepository (介面) ← Infrastructure (實現)
 *
 * @see docs/REPOSITORY_ABSTRACTION_TEMPLATE.md - Repository 最佳實踐
 */

import type { IRepository } from '@/Shared/Domain/IRepository'

// 應該使用 Post Entity，暫時使用 any（待改進）
export interface IPostRepository extends IRepository<any> {
	// 基礎 CRUD 操作由 IRepository<Post> 提供：
	// - save(entity: Post): Promise<void>
	// - findById(id: string): Promise<Post | null>
	// - delete(id: string): Promise<void>
	// - findAll(params?): Promise<Post[]>
	// - count(params?): Promise<number>

	// 業務相關方法可在此添加
	// 例如：
	// findByTitle(title: string): Promise<Post | null>
	// findByAuthor(authorId: string): Promise<Post[]>
}
