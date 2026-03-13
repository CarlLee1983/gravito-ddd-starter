/**
 * @file CartResponseDTO.ts
 * @description 購物車回應 DTO
 */

/**
 * 購物車項目回應格式
 */
export interface CartItemResponse {
	productId: string
	quantity: number
	price: number
	subtotal: number
}

/**
 * 購物車回應 DTO
 */
export interface CartResponseDTO {
	cartId: string
	userId: string
	items: CartItemResponse[]
	itemCount: number
	totalQuantity: number
	totalAmount: number
	createdAt: string
}

/**
 * 轉換 Cart Domain 模型為 DTO
 */
export function toCartResponseDTO(cart: any): CartResponseDTO {
	return {
		cartId: cart.id,
		userId: cart.userId,
		items: cart.items.map((item: any) => ({
			productId: item.productId,
			quantity: item.quantity.value,
			price: item.price,
			subtotal: item.getSubtotal(),
		})),
		itemCount: cart.itemCount,
		totalQuantity: cart.getTotalQuantity(),
		totalAmount: cart.getTotalAmount(),
		createdAt: cart.createdAt.toISOString(),
	}
}
