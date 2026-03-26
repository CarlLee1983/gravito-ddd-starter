import { ValueObject } from '@/Foundation/Domain/ValueObject'

const VALID_CONDITIONS = ['good', 'damaged', 'missing'] as const
type ItemConditionValue = (typeof VALID_CONDITIONS)[number]

interface ItemConditionProps extends Record<string, unknown> {
	readonly value: ItemConditionValue
}

/**
 * 退回商品狀態值物件
 * - good: 良好
 * - damaged: 損壞
 * - missing: 遺失或不完整
 */
export class ItemCondition extends ValueObject<ItemConditionProps> {
	private constructor(props: ItemConditionProps) {
		super(props)
	}

	/** 商品狀態良好 */
	static good(): ItemCondition {
		return new ItemCondition({ value: 'good' })
	}

	/** 商品損壞 */
	static damaged(): ItemCondition {
		return new ItemCondition({ value: 'damaged' })
	}

	/** 商品遺失或不完整 */
	static missing(): ItemCondition {
		return new ItemCondition({ value: 'missing' })
	}

	/** 從字串建立，無效時拋出錯誤 */
	static from(value: string): ItemCondition {
		if (!VALID_CONDITIONS.includes(value as ItemConditionValue)) {
			throw new Error(`無效的商品狀態: ${value}，允許值: ${VALID_CONDITIONS.join(', ')}`)
		}
		return new ItemCondition({ value: value as ItemConditionValue })
	}

	get value(): ItemConditionValue {
		return this.props.value
	}

	toString(): string {
		return this.props.value
	}
}
