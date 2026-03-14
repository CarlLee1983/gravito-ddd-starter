/**
 * @file PlaceOrderDTO.ts
 * @description 建立訂單相關的資料傳輸物件 (DTO)
 */

/**
 * 建立訂單請求 DTO
 * 
 * 用於在應用層接收建立訂單所需的所有必要資訊
 */
export interface PlaceOrderDTO {
  /** 使用者 ID */
  userId: string
  /** 訂單項目列表 */
  lines: OrderLineDTO[]
  /** 稅金金額（可選） */
  taxAmount?: number
}

/**
 * 訂單行項目 DTO
 * 
 * 定義單個產品在訂單中的詳細資訊
 */
export interface OrderLineDTO {
  /** 產品 ID */
  productId: string
  /** 產品名稱 */
  productName: string
  /** 購買數量 */
  quantity: number
  /** 單位價格 */
  unitPrice: number
}

/**
 * 訂單回應 DTO
 * 
 * 用於向表現層返回訂單處理後的詳細結果
 */
export interface OrderResponseDTO {
  /** 訂單 ID */
  orderId: string
  /** 使用者 ID */
  userId: string
  /** 訂單狀態 */
  status: string
  /** 訂單項目列表 */
  lines: OrderLineResponseDTO[]
  /** 價格彙總資訊 */
  total: {
    /** 小計金額 */
    subtotal: number
    /** 稅金金額 */
    tax: number
    /** 總金額 */
    total: number
    /** 貨幣代碼 */
    currency: string
  }
  /** 建立時間 */
  createdAt: string
  /** 更新時間 */
  updatedAt: string
}

/**
 * 訂單行項目回應 DTO
 * 
 * 用於回應中包含計算後的行項目金額
 */
export interface OrderLineResponseDTO {
  /** 產品 ID */
  productId: string
  /** 產品名稱 */
  productName: string
  /** 數量 */
  quantity: number
  /** 單位價格 */
  unitPrice: number
  /** 該行項目的總計金額 */
  lineTotal: number
}
