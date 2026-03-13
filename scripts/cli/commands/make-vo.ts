/**
 * @file scripts/cli/commands/make-vo.ts
 * @description make vo <Module> <VOName> - 新增 Value Object
 */

import {
	parseArgs,
	toPascalCase,
	writeFileWithDir,
	assertModuleExists,
	log,
} from '../utils'

export async function run(args: string[]) {
	const { positional } = parseArgs(args)
	const moduleName = positional[0]
	const voName = positional[1]

	if (!moduleName || !voName) {
		throw new Error('❌ 錯誤：請提供模組名稱和值物件名稱\n用法: bun make vo <Module> <VOName>')
	}

	try {
		await assertModuleExists(moduleName)

		const module = toPascalCase(moduleName)
		const vo = toPascalCase(voName)

		const content = `/**
 * @file ${vo}.ts
 * @description ${vo} 值物件
 */

import { ValueObject } from '@/Shared/Domain/ValueObject'

interface ${vo}Props extends Record<string, unknown> {
	readonly value: string
}

export class ${vo} extends ValueObject<${vo}Props> {
	private constructor(props: ${vo}Props) {
		super(props)
	}

	/**
	 * 建立 ${vo} 值物件
	 *
	 * 執行驗證和規範化：
	 * - (在此添加驗證邏輯)
	 */
	static create(value: string): ${vo} {
		if (!value || value.trim().length === 0) {
			throw new Error('${vo} 不能為空')
		}
		// 添加驗證邏輯...
		return new ${vo}({ value: value.trim() })
	}

	get value(): string {
		return this.props.value
	}

	toString(): string {
		return this.props.value
	}
}
`

		const voPath = `app/Modules/${module}/Domain/ValueObjects/${vo}.ts`
		await writeFileWithDir(voPath, content)

		log.success(`值物件已建立: ${vo}`)
		console.log(`\n📂 位置: ${voPath}`)
		console.log(`\n✨ 下一步:`)
		console.log(`   1. 編輯上方檔案實現驗證邏輯`)
		console.log(`   2. 在聚合根中使用此值物件代替原始型別`)
		console.log(`   3. 在 index.ts 中導出此值物件\n`)
	} catch (error) {
		throw error
	}
}
