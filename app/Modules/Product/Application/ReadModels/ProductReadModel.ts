/**
 * @file ProductReadModel.ts
 * @description 產品讀側模型，用於查詢操作的資料結構
 */

/**
 * 產品讀側模型介面
 * @interface ProductReadModel
 */
export interface ProductReadModel {
  /** @property {string} id 產品 ID */
  id: string
  /** @property {string} name 產品名稱 */
  name: string
  /** @property {number} amount 價格金額 */
  amount: number
  /** @property {string} currency 幣別 */
  currency: string
  /** @property {string} sku SKU */
  sku: string
  /** @property {number} stockQuantity 庫存數量 */
  stockQuantity: number
  /** @property {boolean} isInStock 是否有庫存 */
  isInStock: boolean
  /** @property {Date} createdAt 建立時間 */
  createdAt: Date
}
