/**
 * @file ProductReadModel.ts
 * @description 產品讀側模型
 */

export interface ProductReadModel {
  id: string
  name: string
  amount: number
  currency: string
  sku: string
  stockQuantity: number
  isInStock: boolean
  createdAt: Date
}
