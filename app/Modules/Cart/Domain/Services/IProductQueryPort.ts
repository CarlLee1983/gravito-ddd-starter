/**
 * @file IProductQueryPort.ts
 * @description Product Context 防腐層 (Anti-Corruption Layer) 介面
 *
 * Cart Domain 層定義的 Port，隔離 Product Context 的具體實現
 * 只公開 Cart 真正需要的商品資訊
 */

/**
 * 商品查詢 Port（防腐層）
 *
 * 此介面隱藏 Product Context 的複雜性，Cart Domain 只需知道：
 * - 商品是否存在
 * - 商品的當前價格
 */
export interface IProductQueryPort {
	/**
	 * 查詢商品是否存在且取得當前價格
	 *
	 * @param productId - 商品 ID
	 * @returns Promise 包含 { exists: boolean, price?: number } 或 null（查詢失敗）
	 */
	getProductPrice(productId: string): Promise<{ exists: boolean; price?: number } | null>
}
