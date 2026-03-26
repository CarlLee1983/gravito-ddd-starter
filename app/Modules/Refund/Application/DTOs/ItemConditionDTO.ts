/**
 * 退貨商品狀態 DTO — 確認收到退貨時，傳遞各項目的實際狀態
 */
export interface ItemConditionDTO {
	returnItemId: string
	condition: 'good' | 'damaged' | 'missing'
}
