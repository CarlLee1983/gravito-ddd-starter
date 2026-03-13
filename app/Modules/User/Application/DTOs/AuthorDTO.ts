/**
 * 作者資訊 DTO
 *
 * @module AuthorDTO
 * @description
 * 用途：
 * - 將 User 聚合根的基本資訊（ID、名稱、郵件）作為 DTO 格式暴露給其他模組
 * - 用於跨模組通訊時的標準化作者資訊結構
 *
 * 位置：User 模組的 Application 層（AuthorDTO 屬於 User 領域）
 * 依賴方向：其他 Module → User（Post 等模組依賴 User 的作者資訊）
 *
 * **DDD 角色**
 * - 核心：Data Transfer Object（資料傳輸物件）
 * - 職責：User 領域的作者基本資訊在應用層的表示。
 */

/**
 * 作者資料傳輸介面
 */
export interface AuthorDTO {
	/** 作者唯一識別碼 */
	id: string
	/** 作者名稱 */
	name: string
	/** 作者電子郵件 */
	email: string
}
