/**
 * 基礎值對象 - 不可變的領域概念
 *
 * @module ValueObject
 * @description 值對象的特性：
 * - 無 ID，由其屬性值定義
 * - 不可變 (Immutable)
 * - 相等性基於值，不是引用
 *
 * **DDD 角色**
 * - 核心：Value Object（值對象）
 * - 職責：描述領域中的量化、屬性或小概念。
 */

/**
 * 基礎值對象抽象類別
 *
 * @abstract
 */
export abstract class ValueObject {
	/**
	 * 比較兩個值對象是否相等
	 * 子類應覆蓋此方法，比較其所有屬性
	 *
	 * @abstract
	 * @param {ValueObject} other - 要比較的另一個值對象
	 * @returns {boolean} 是否相等
	 */
	abstract equals(other: ValueObject): boolean

	/**
	 * 值對象的字串表示
	 *
	 * @abstract
	 * @returns {string} 字串描述
	 */
	abstract toString(): string
}
