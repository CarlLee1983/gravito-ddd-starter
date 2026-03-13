/**
 * @file scripts/cli/commands/make-check.ts
 * @description make check - 檢查所有模組的架構邊界規則
 */

import { readdir, readFile } from 'fs/promises'
import { log } from '../utils'
import { join } from 'path'

const FORBIDDEN_IMPORTS = [
	'@gravito/atlas',
	'drizzle-orm',
	'prisma',
	'typeorm',
	'@gravito/core',
]

const FORBIDDEN_TYPES = [
	'SelectQueryBuilder',
	'PrismaClient',
	'EntityManager',
	'DataSource',
]

interface ViolationResult {
	file: string
	line: number
	content: string
	reason: string
}

export async function run(_args: string[]) {
	try {
		console.log(`\n🔍 檢查所有模組的架構邊界規則...\n`)

		const violations: ViolationResult[] = []
		const modules = await readdir('app/Modules').catch(() => [])

		let totalFiles = 0

		for (const module of modules) {
			const domainPath = join('app/Modules', module, 'Domain')
			const appPath = join('app/Modules', module, 'Application')

			// 檢查 Domain 層
			try {
				const domainViolations = await checkDirectory(domainPath, module, 'Domain')
				violations.push(...domainViolations)
				totalFiles += domainViolations.length > 0 ? 1 : 0
			} catch (e) {
				// 目錄不存在
			}

			// 檢查 Application 層
			try {
				const appViolations = await checkDirectory(appPath, module, 'Application')
				violations.push(...appViolations)
				totalFiles += appViolations.length > 0 ? 1 : 0
			} catch (e) {
				// 目錄不存在
			}
		}

		if (violations.length === 0) {
			log.success(`架構邊界檢查通過（${modules.length} 個模組）\n`)
			return
		}

		// 輸出違規
		console.log(`❌ 發現 ${violations.length} 個違規\n`)

		for (const v of violations) {
			console.log(`  📄 ${v.file}:${v.line}`)
			console.log(`     ❌ ${v.reason}`)
			console.log(`     內容: ${v.content.trim()}`)
			console.log('')
		}

		process.exit(1)
	} catch (error) {
		throw error
	}
}

async function checkDirectory(dir: string, module: string, layer: string): Promise<ViolationResult[]> {
	const violations: ViolationResult[] = []

	try {
		const files = await readdir(dir, { recursive: true })

		for (const file of files) {
			if (!file.toString().endsWith('.ts')) continue

			const filePath = join(dir, file.toString())
			const content = await readFile(filePath, 'utf-8')
			const lines = content.split('\n')

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i]

				// 檢查禁止的 import
				for (const forbidden of FORBIDDEN_IMPORTS) {
					if (line.includes(`import`) && line.includes(forbidden)) {
						violations.push({
							file: `${module}/${layer}/${file}`,
							line: i + 1,
							content: line,
							reason: `${layer} 層不應 import '${forbidden}'`,
						})
					}
				}

				// 檢查禁止的型別
				if (layer === 'Application') {
					for (const type of FORBIDDEN_TYPES) {
						if (line.includes(type)) {
							violations.push({
								file: `${module}/${layer}/${file}`,
								line: i + 1,
								content: line,
								reason: `${layer} 層不應使用 ORM 型別 '${type}'`,
							})
						}
					}
				}
			}
		}
	} catch (e) {
		// 目錄不存在
	}

	return violations
}
