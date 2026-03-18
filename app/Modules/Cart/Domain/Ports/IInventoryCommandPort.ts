/**
 * @file IInventoryCommandPort.ts
 * @description Inventory 防腐層 Port（Anti-Corruption Layer）
 *
 * 位置：Cart Domain/Ports（防腐層在消費者側定義）
 * 責任：隱藏 Inventory 模組的實現細節，提供 Cart 所需的公開介面
 *
 * **設計原則**:
 * - Cart 不知道 Inventory 的內部實現
 * - 只暴露 Cart 關心的操作（預留、查詢）
 * - 隱藏 Inventory 的複雜業務邏輯
 * - 易於測試（可 Mock 實現）
 *
 * **依賴方向**: Cart → (IInventoryCommandPort) → Inventory Adapter
 */

/**
 * Inventory 命令 Port（防腐層）
 *
 * 提供 Cart 進行庫存操作所需的公開方法。
 * 實現由 Inventory 模組提供（透過 Adapter）。
 */
export interface IInventoryCommandPort {
	/**
	 * 查詢商品是否可用及庫存狀態
	 *
	 * **使用場景**: 加入購物車時驗證商品是否有貨
	 *
	 * @param productId - 商品 ID
	 * @param requiredQuantity - 需要的數量
	 * @returns Promise 包含：
	 *   - available: 是否有足夠的可用庫存
	 *   - currentStock: 目前可用庫存數量（僅當 available=true 時有意義）
	 * @throws Error 若商品不存在
	 */
	checkAvailability(
		productId: string,
		requiredQuantity: number
	): Promise<{
		available: boolean
		currentStock: number
	}>

	/**
	 * 預留庫存（購物車結帳時）
	 *
	 * **使用場景**: CheckoutSaga Step 3 - 為訂單預留庫存
	 *
	 * @param productId - 商品 ID
	 * @param quantity - 預留數量
	 * @param orderId - 訂單 ID（用於追蹤）
	 * @returns Promise 包含預留結果
	 * @throws Error 若庫存不足
	 * @throws OptimisticLockException 版本衝突時拋出
	 */
	reserve(
		productId: string,
		quantity: number,
		orderId: string
	): Promise<{
		reservationId: string
		reserved: number
		available: number
	}>

	/**
	 * 扣減庫存（訂單支付成功時）
	 *
	 * **使用場景**: PaymentSucceeded 事件觸發，確認預留為已扣減
	 *
	 * @param productId - 商品 ID
	 * @param quantity - 扣減數量
	 * @param orderId - 訂單 ID
	 * @returns Promise 包含扣減結果
	 * @throws Error 若預留庫存不足
	 * @throws OptimisticLockException 版本衝突時拋出
	 */
	deduct(
		productId: string,
		quantity: number,
		orderId: string
	): Promise<{
		inventoryId: string
		remainingStock: number
	}>

	/**
	 * 釋放預留庫存（訂單取消/失敗時）
	 *
	 * **使用場景**: CheckoutSaga 補償 - 釋放已預留的庫存
	 *
	 * @param productId - 商品 ID
	 * @param quantity - 釋放數量
	 * @param orderId - 訂單 ID
	 * @param reason - 釋放原因（預設 'order_cancelled'）
	 * @returns Promise<void>
	 * @throws Error 若預留庫存不足
	 */
	release(
		productId: string,
		quantity: number,
		orderId: string,
		reason?: string
	): Promise<void>
}

/**
 * 防腐層設計說明
 *
 * **為什麼需要防腐層？**
 * 1. **模組隔離**: Cart 不直接依賴 Inventory 的實現
 * 2. **易於測試**: 可輕鬆 Mock IInventoryCommandPort
 * 3. **易於替換**: Inventory 實現改變時，接口保持穩定
 * 4. **語義清晰**: 只暴露 Cart 所需的操作
 *
 * **實現方式**:
 * - Inventory 模組提供 InventoryCommandAdapter
 * - 在 Service Provider 中綁定 IInventoryCommandPort → InventoryCommandAdapter
 * - Cart 模組注入 IInventoryCommandPort 使用
 *
 * **依賴圖**:
 * ```
 * Cart Domain/Application
 *     ↓ (依賴)
 * IInventoryCommandPort (防腐層 Port，Cart 定義)
 *     ↓ (實現)
 * InventoryCommandAdapter (Adapter，Inventory 提供)
 *     ↓ (依賴)
 * InventoryAggregate + Repository (Inventory Domain)
 * ```
 *
 * **好處**:
 * - ✅ Cart 是純淨的、與 Inventory 解耦
 * - ✅ Inventory 可獨立演化（加入多倉庫、庫存預測等）
 * - ✅ 測試時可用假實現
 * - ✅ 未來可輕鬆切換為遠程庫存服務
 */
