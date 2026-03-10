/**
 * Product → Shop 適配器
 *
 * 用途：轉換 Product 模組的介面為 Shop 模組期望的介面
 * 位置：適配器層，連接兩個獨立的模組
 *
 * 優勢：
 * - Product 模組完全獨立，不知道 Shop 的存在
 * - Shop 模組只依賴此適配器，不依賴 Product 實現
 * - 支援多個 Shop 適配器實現，不影響 Product 模組
 */

/**
 * Shop 模組期望的 ProductService 介面
 * 此介面定義了 Shop 從 Product 模組需要的功能
 */
export interface IProductServiceForShop {
  /**
   * 取得產品詳細資訊
   */
  getProductInfo(productId: string): Promise<ProductInfoDTO>

  /**
   * 批量驗證產品（存在性、狀態、庫存）
   */
  validateItems(items: OrderItem[]): Promise<ValidationResult>

  /**
   * 計算訂單項目的總價
   */
  calculateItemsTotalPrice(items: OrderItem[]): Promise<number>
}

/**
 * DTO: Shop 期望的產品資訊格式
 */
export interface ProductInfoDTO {
  id: string
  name: string
  price: number
  currency: string
  available: boolean
  stock?: number
}

/**
 * DTO: Shop 期望的訂單項目格式
 */
export interface OrderItem {
  productId: string
  quantity: number
}

/**
 * DTO: 驗證結果
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  validProducts: ProductInfoDTO[]
}

/**
 * 產品到購物服務的適配器
 *
 * 此適配器是 Product 模組和 Shop 模組之間的橋樑。
 * 它將 Product 提供的功能適配為 Shop 期望的形式。
 */
export class ProductToShopAdapter implements IProductServiceForShop {
  /**
   * @param productRepository - Product 模組提供的倉庫
   * 注意：此適配器只依賴於介面 (IProductRepository)，
   * 不依賴於任何具體實作或 Product 模組的內部細節。
   */
  constructor(private productRepository: any) {
    // 在實際應用中，類型應該是：
    // constructor(private productRepository: IProductRepository)
  }

  /**
   * 實現：取得產品詳細資訊
   */
  async getProductInfo(productId: string): Promise<ProductInfoDTO> {
    const product = await this.productRepository.findById(productId)

    if (!product) {
      throw new Error(`Product not found: ${productId}`)
    }

    // 適配：轉換 Product DTO 為 Shop 期望的格式
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      currency: product.currency || 'USD',
      available: product.status === 'published',
      stock: product.stock
    }
  }

  /**
   * 實現：批量驗證產品
   */
  async validateItems(items: OrderItem[]): Promise<ValidationResult> {
    const errors: string[] = []
    const validProducts: ProductInfoDTO[] = []

    for (const item of items) {
      try {
        const product = await this.productRepository.findById(item.productId)

        // 檢查：產品存在
        if (!product) {
          errors.push(`Product not found: ${item.productId}`)
          continue
        }

        // 檢查：產品已發佈
        if (product.status !== 'published') {
          errors.push(
            `Product not available for purchase: ${item.productId}`
          )
          continue
        }

        // 檢查：庫存充足
        if (product.stock && product.stock < item.quantity) {
          errors.push(
            `Insufficient stock for product ${item.productId}: ` +
            `requested ${item.quantity}, available ${product.stock}`
          )
          continue
        }

        // 驗證通過，添加到有效產品清單
        const productInfo = await this.getProductInfo(item.productId)
        validProducts.push(productInfo)
      } catch (error) {
        errors.push(
          `Error validating product ${item.productId}: ` +
          `${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      validProducts
    }
  }

  /**
   * 實現：計算訂單項目的總價
   */
  async calculateItemsTotalPrice(items: OrderItem[]): Promise<number> {
    let total = 0

    for (const item of items) {
      const productInfo = await this.getProductInfo(item.productId)
      total += productInfo.price * item.quantity
    }

    return total
  }
}
