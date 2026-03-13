/**
 * @file ProductResponseDTO.ts
 * @description 產品回應 DTO
 */

export interface ProductResponseDTO {
  id: string
  name: string
  amount: number
  currency: string
  sku: string
  stockQuantity: number
  isInStock: boolean
  createdAt: string
}
