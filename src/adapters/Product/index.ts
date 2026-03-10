/**
 * Product 適配器模組
 *
 * 此模組聚合所有與 Product 模組相關的適配器。
 * 使用方只需導入此模組，而無需知道具體的適配器實作。
 */

export { ProductToShopAdapter } from './ProductToShopAdapter'
export type {
  IProductServiceForShop,
  ProductInfoDTO,
  OrderItem,
  ValidationResult
} from './ProductToShopAdapter'
