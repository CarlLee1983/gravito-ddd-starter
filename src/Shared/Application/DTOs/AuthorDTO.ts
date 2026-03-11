/**
 * 作者資訊 DTO（跨網域/模組共享）
 *
 * @module AuthorDTO
 * @description
 * 用途：
 * - 多個網域（Post、Review、Order 等）都可能需要作者資訊。
 * - 統一定義作者的數據結構，避免重複實作。
 *
 * 位置：Shared 層（不屬於任何特定網域）。
 * 依賴方向：各 Domain → Shared（無反向依賴）。
 *
 * **DDD 角色**
 * - 核心：Data Transfer Object（資料傳輸物件）
 * - 職責：作為跨網域傳遞作者基本資訊的標準結構。
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
