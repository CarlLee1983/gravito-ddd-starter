/**
 * @file AuthorInfo.ts
 * @description 表示文章作者資訊的值物件（跨 Bounded Context 的 ACL 契約）
 * @module src/Modules/Post/Domain/ValueObjects
 */

/**
 * AuthorInfo 值物件
 *
 * 在 DDD 架構中作為「值物件 (Value Object)」，代表跨模組邊界的作者資訊。
 *
 * 職責：
 * 1. 封裝來自其他 Bounded Context（User 模組）的作者資訊
 * 2. 作為 Domain 層與 Infrastructure ACL 層之間的契約
 * 3. 由 UserToPostAdapter 建立，供 Domain 邏輯使用
 */
export class AuthorInfo {
	/**
	 * 建立 AuthorInfo 實例
	 *
	 * @param id - 作者唯一識別符
	 * @param name - 作者名稱（原始字符串）
	 * @param email - 作者郵件地址（原始字符串）
	 */
	constructor(
		public readonly id: string,
		public readonly name: string,
		public readonly email: string,
	) {}
}
