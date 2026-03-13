/**
 * @file scripts/cli/commands/make-service.ts
 * @description make service <Module> <ServiceName> - 新增 Application Service
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
	const serviceName = positional[1]

	if (!moduleName || !serviceName) {
		throw new Error('❌ 錯誤：請提供模組名稱和服務名稱\n用法: bun make service <Module> <ServiceName>')
	}

	try {
		await assertModuleExists(moduleName)

		const module = toPascalCase(moduleName)
		const service = toPascalCase(serviceName)

		const content = `/**
 * @file ${service}.ts
 * @description ${service} 應用服務
 */

/**
 * ${service} 輸入 DTO
 */
export interface ${service}Input {
	// 在此定義輸入欄位
}

/**
 * ${service} 輸出 DTO
 */
export interface ${service}Output {
	// 在此定義輸出欄位
}

/**
 * ${service} 應用服務
 *
 * 在應用層（Application Layer）中，負責協調領域物件完成特定使用案例。
 */
export class ${service} {
	constructor(
		// 注入必要的依賴（Repository、Port 等）
	) {}

	/**
	 * 執行服務
	 */
	async execute(input: ${service}Input): Promise<${service}Output> {
		// 實現業務邏輯...
		throw new Error('Not implemented')
	}
}
`

		const servicePath = `app/Modules/${module}/Application/Services/${service}.ts`
		await writeFileWithDir(servicePath, content)

		log.success(`應用服務已建立: ${service}`)
		console.log(`\n📂 位置: ${servicePath}`)
		console.log(`\n✨ 下一步:`)
		console.log(`   1. 編輯上方檔案實現 execute() 方法`)
		console.log(`   2. 在 ServiceProvider 中註冊此服務`)
		console.log(`   3. 在 Controller 中注入並使用此服務`)
		console.log(`   4. 在 index.ts 中導出此服務\n`)
	} catch (error) {
		throw error
	}
}
