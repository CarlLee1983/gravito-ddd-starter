/**
 * @file IAuthorService.ts
 * @description 定義 Post 模組與作者資訊互動的領域服務介面 (Port)
 * @module src/Modules/Post/Domain/Services
 */

import type { AuthorInfo } from '../ValueObjects/AuthorInfo'

/**
 * IAuthorService 介面
 *
 * 在 DDD 架構中作為「領域服務 (Domain Service)」的介面。
 *
 * 職責：
 * 1. 提供查詢作者詳細資訊的合約。
 * 2. 作為模組間溝通的 Port，由 Post 模組定義其所需資料。
 * 3. 實作通常位於基礎設施層的防腐層 (ACL) 適配器中。
 */
export interface IAuthorService {
	/**
	 * 根據作者唯一識別符尋找作者資訊
	 *
	 * @param authorId - 作者唯一識別符
	 * @returns Promise 包含作者資訊 AuthorInfo 或 null (若找不到)
	 */
	findAuthor(authorId: string): Promise<AuthorInfo | null>
}
