/**
 * @file scripts/cli/commands/make-dto.ts
 * @description make dto <Module> <DTOName> - 新增 DTO
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
	const dtoName = positional[1]

	if (!moduleName || !dtoName) {
		throw new Error('❌ 錯誤：請提供模組名稱和 DTO 名稱\n用法: bun make dto <Module> <DTOName>')
	}

	try {
		await assertModuleExists(moduleName)

		const module = toPascalCase(moduleName)
		const dto = toPascalCase(dtoName)

		const content = `/**
 * @file ${dto}.ts
 * @description ${dto} 資料傳輸物件
 */

export class ${dto} {
	constructor(
		// 在此定義 DTO 屬性
	) {}

	static fromEntity(entity: any): ${dto} {
		// 從領域實體轉換
		throw new Error('Not implemented')
	}

	toJSON() {
		return {
			// 定義 JSON 序列化
		}
	}
}
`

		const dtoPath = `app/Modules/${module}/Application/DTOs/${dto}.ts`
		await writeFileWithDir(dtoPath, content)

		log.success(`DTO 已建立: ${dto}`)
		console.log(`\n📂 位置: ${dtoPath}`)
		console.log(`\n✨ 下一步:`)
		console.log(`   1. 編輯上方檔案定義 DTO 屬性和轉換邏輯`)
		console.log(`   2. 在 Application Service 中使用此 DTO`)
		console.log(`   3. 在 Controller 中返回此 DTO`)
		console.log(`   4. 在 index.ts 中導出此 DTO\n`)
	} catch (error) {
		throw error
	}
}
