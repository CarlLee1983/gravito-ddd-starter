/**
 * @file scripts/cli/commands/make-event.ts
 * @description make event <Module> <EventName> - 新增 Domain Event
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
	const eventName = positional[1]

	if (!moduleName || !eventName) {
		throw new Error('❌ 錯誤：請提供模組名稱和事件名稱\n用法: bun make event <Module> <EventName>')
	}

	try {
		await assertModuleExists(moduleName)

		const module = toPascalCase(moduleName)
		const event = toPascalCase(eventName)

		const content = `/**
 * @file ${event}.ts
 * @description ${event} 領域事件
 */

import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class ${event} extends DomainEvent {
	constructor(
		// 在此定義事件屬性
	) {
		super()
	}

	toJSON() {
		return {
			// 定義序列化邏輯
		}
	}
}
`

		const eventPath = `app/Modules/${module}/Domain/Events/${event}.ts`
		await writeFileWithDir(eventPath, content)

		log.success(`事件已建立: ${event}`)
		console.log(`\n📂 位置: ${eventPath}`)
		console.log(`\n✨ 下一步:`)
		console.log(`   1. 編輯上方檔案定義事件屬性`)
		console.log(`   2. 在聚合根 (Aggregate Root) 的 applyEvent() 中處理此事件`)
		console.log(`   3. 在聚合根中使用 raiseEvent(new ${event}(...)) 發佈此事件`)
		console.log(`   4. 在 index.ts 中導出此事件\n`)
	} catch (error) {
		throw error
	}
}
