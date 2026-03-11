/**
 * 基礎 DTO (Data Transfer Object)
 *
 * @module BaseDTO
 * @description
 * DTO 用於在層與層之間傳遞數據，不包含業務邏輯。
 * 作為應用層的輸出 DTO，由展示層（Presentation Layer）消費並轉換為 API 響應。
 *
 * 繼承此類別的 DTO 應保持唯讀（readonly）特性，確保傳遞過程中的資料一致性。
 *
 * **DDD 角色**
 * - 核心：Data Transfer Object（資料傳輸物件）
 * - 職責：解耦領域模型與外部介面。
 */
export class BaseDTO {
	/**
	 * 將 DTO 轉換為純 JSON 物件（用於 API 響應序列化）
	 *
	 * 預設實作會淺拷貝所有實例屬性。
	 * 子類別可覆蓋此方法以實現更複雜的轉換邏輯（例如處理巢狀對象或日期格式）。
	 *
	 * @returns {Record<string, any>} 包含 DTO 數據的純物件
	 */
	toJSON(): Record<string, any> {
		return { ...this }
	}
}
