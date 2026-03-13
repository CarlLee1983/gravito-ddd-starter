/**
 * @file AddItemDTO.ts
 * @description 加入商品 DTO
 */

/**
 * 加入商品至購物車的請求 DTO
 */
export interface AddItemDTO {
	userId: string
	productId: string
	quantity: number
}
