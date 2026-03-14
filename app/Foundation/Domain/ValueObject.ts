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
 *
 * **泛型支援**
 * - ValueObject<T> 其中 T 為 props 的型別
 * - 自動凍結 props 以確保不可變
 * - 預設結構相等性比較 (基於 JSON.stringify)
 */

/**
 * 基礎值對象抽象類別
 *
 * @abstract
 * @template T - Props 的型別（應為物件型別）
 *
 * @example
 * ```typescript
 * interface EmailProps { readonly value: string }
 * class Email extends ValueObject<EmailProps> {
 *   private constructor(props: EmailProps) {
 *     super(props)
 *   }
 *   static create(email: string): Email {
 *     return new Email({ value: email })
 *   }
 * }
 * ```
 */
export abstract class ValueObject<T extends Record<string, unknown>> {
	/**
	 * 不可變的屬性物件
	 * 被 Object.freeze 凍結，無法修改
	 *
	 * @protected
	 * @readonly
	 */
	protected readonly props: Readonly<T>

	/**
	 * 建構子 -- 凍結 props 以確保不可變性
	 *
	 * @param {T} props - 值對象的屬性
	 */
	protected constructor(props: T) {
		// 創建副本並深層凍結
		this.props = Object.freeze({ ...props }) as Readonly<T>
	}

	/**
	 * 比較兩個值對象是否相等
	 * 預設實現基於結構相等性（深層比較 props）
	 * 子類可覆蓋此方法以實現自訂比較邏輯
	 *
	 * @param {ValueObject<T>} other - 要比較的另一個值對象
	 * @returns {boolean} 是否相等
	 */
	equals(other: ValueObject<T>): boolean {
		if (other === null || other === undefined) {
			return false
		}
		if (other.constructor !== this.constructor) {
			return false
		}
		// 基於 JSON 字串化的結構相等性
		return JSON.stringify(this.props) === JSON.stringify(other.props)
	}

	/**
	 * 值對象的字串表示
	 * 子類必須實作此方法
	 *
	 * @abstract
	 * @returns {string} 字串描述
	 */
	abstract toString(): string
}
