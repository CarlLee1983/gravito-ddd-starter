/**
 * PlaceOrderDTO - 建立訂單請求 DTO
 */
export interface PlaceOrderDTO {
  userId: string
  lines: OrderLineDTO[]
  taxAmount?: number
}

/**
 * OrderLineDTO - 訂單行項目 DTO
 */
export interface OrderLineDTO {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

/**
 * OrderResponseDTO - 訂單回應 DTO
 */
export interface OrderResponseDTO {
  orderId: string
  userId: string
  status: string
  lines: OrderLineResponseDTO[]
  total: {
    subtotal: number
    tax: number
    total: number
    currency: string
  }
  createdAt: string
  updatedAt: string
}

/**
 * OrderLineResponseDTO - 訂單行項目回應 DTO
 */
export interface OrderLineResponseDTO {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}
