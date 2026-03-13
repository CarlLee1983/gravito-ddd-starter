/**
 * @file scripts/cli/commands/make-list.ts
 * @description make list - 列出所有模組及狀態
 */

import { listModules, log } from '../utils'
import { existsSync } from 'fs'
import { join } from 'path'

export async function run(_args: string[]) {
	try {
		const modules = await listModules()

		if (modules.length === 0) {
			log.warn('未找到任何模組')
			return
		}

		console.log(`\n📦 已有模組（${modules.length}）\n`)

		for (const module of modules) {
			const modulePath = join('app/Modules', module)
			const hasTests = existsSync(join(modulePath, 'tests'))
			const hasIndex = existsSync(join(modulePath, 'index.ts'))

			const status = hasIndex ? '✅' : '⚠️'
			const testsBadge = hasTests ? '🧪' : '  '

			console.log(`${status} ${testsBadge} ${module.padEnd(20)} ${modulePath}`)
		}

		console.log('')
	} catch (error) {
		throw error
	}
}
