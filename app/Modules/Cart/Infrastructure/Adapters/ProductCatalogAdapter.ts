/**
 * @file ProductCatalogAdapter.ts
 * @description Product Context 防腐層 (Anti-Corruption Layer)
 *
 * 此適配器隱藏 Product Context 的複雜性，只公開 Cart 真正需要的資訊。
 * Cart 模組完全無法感知 Product 模組的內部實現。
 */

import type { IProductQueryPort } from '../../Domain/Services/IProductQueryPort'
import type { IProductRepository } from '@/Modules/Product/Domain/Repositories/IProductRepository'

/**
 * Product Context 防腐層適配器
 *
 * 在 DDD 架構中作為「防腐層 (Anti-Corruption Layer, ACL)」的一部分。
 * 職責：
 * 1. 調用 Product 模組的倉儲取得商品
 * 2. 轉換 Product 領域模型為 Cart 需要的簡潔資訊
 * 3. 隔離兩個模組之間的變化
 */
export class ProductCatalogAdapter implements IProductQueryPort {
	/**
	 * 建立 ProductCatalogAdapter 實例
	 *
	 * @param productRepository - Product 模組的商品倉儲介面
	 */
	constructor(private readonly productRepository: IProductRepository) {}

	/**
	 * 查詢商品是否存在且取得當前價格
	 *
	 * 防腐層在此執行翻譯：Product Domain 語言 → Cart Domain 語言
	 * 只公開 Cart 需要的資訊，隱藏 Product 的其他細節
	 *
	 * @param productId - 商品 ID
	 * @returns Promise 包含 { exists, price } 或 null（查詢失敗）
	 */
	async getProductPrice(productId: string): Promise<{ exists: boolean; price?: number } | null> {
		try {
			// 直接使用原始字符串 ID，避免型別轉換問題
			const product = await this.productRepository.findById(productId as any)

			if (!product) {
				return { exists: false }
			}

			// 翻譯：Product Domain → Cart Domain
			// 注意：我們只提取 Cart 真正需要的欄位（價格）
			return {
				exists: true,
				price: product.price.amount, // Price ValueObject 中的金額
			}
		} catch (error) {
			// 查詢失敗時回傳 null，讓上層決定如何處理
			console.error('Product query failed:', error)
			return null
		}
	}
}
