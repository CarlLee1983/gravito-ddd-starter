/**
 * @file ProductResponseDTO.ts
 * @description 產品回應資料傳輸物件 (DTO)
 */

/**
 * 產品回應 DTO 介面
 * @interface ProductResponseDTO
 */
export interface ProductResponseDTO {
  /** @property {string} id 產品 ID */
  id: string
  /** @property {string} name 產品名稱 */
  name: string
  /** @property {object} price 價格 */
  price: {
    /** @property {number} amount 價格金額 */
    amount: number
    /** @property {string} currency 幣別 */
    currency: string
  }
  /** @property {string} sku SKU */
  sku: string
  /** @property {number} stockQuantity 庫存數量 */
  stockQuantity: number
  /** @property {boolean} isInStock 是否有庫存 */
  isInStock: boolean
  /** @property {string} createdAt 建立時間（ISO 字串格式） */
  createdAt: string
  /** @property {string} updatedAt 更新時間（ISO 字串格式） */
  updatedAt: string
}
