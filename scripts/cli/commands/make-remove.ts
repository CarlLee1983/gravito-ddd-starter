/**
 * @file scripts/cli/commands/make-remove.ts
 * @description make remove <Module> - 安全刪除模組
 */

import { rm, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { parseArgs, log, confirm, toPascalCase } from '../utils'

export async function run(args: string[]) {
	const { positional } = parseArgs(args)
	const moduleName = positional[0]

	if (!moduleName) {
		throw new Error('❌ 錯誤：請提供模組名稱\n用法: bun make remove <Module>')
	}

	try {
		const module = toPascalCase(moduleName)
		const modulePath = join('app/Modules', module)

		// 檢查模組是否存在
		if (!existsSync(modulePath)) {
			throw new Error(`模組不存在: ${module}`)
		}

		// 列出將刪除的檔案
		const files = await readdir(modulePath, { recursive: true })
		console.log(`\n⚠️  將刪除以下檔案 (${files.length} 個):\n`)
		for (const file of files.slice(0, 10)) {
			console.log(`   📄 ${module}/${file}`)
		}
		if (files.length > 10) {
			console.log(`   ... 還有 ${files.length - 10} 個檔案\n`)
		}

		// 清理翻譯檔案
		const localeFiles = []
		if (existsSync(`locales/en/${moduleName.toLowerCase()}.json`)) {
			localeFiles.push(`locales/en/${moduleName.toLowerCase()}.json`)
		}
		if (existsSync(`locales/zh-TW/${moduleName.toLowerCase()}.json`)) {
			localeFiles.push(`locales/zh-TW/${moduleName.toLowerCase()}.json`)
		}

		if (localeFiles.length > 0) {
			console.log(`\n   翻譯檔案:`)
			for (const file of localeFiles) {
				console.log(`   📄 ${file}`)
			}
		}

		// 清理 Port 介面
		const portFile = `app/Shared/Infrastructure/Ports/Messages/I${module}Messages.ts`
		if (existsSync(portFile)) {
			console.log(`\n   Port 介面:`)
			console.log(`   📄 ${portFile}`)
		}

		// 確認刪除
		const shouldDelete = await confirm(`\n⚠️  確認刪除模組 "${module}"? (y/n):`)

		if (!shouldDelete) {
			log.warn('刪除已取消')
			return
		}

		// 執行刪除
		await rm(modulePath, { recursive: true, force: true })

		// 刪除翻譯檔案
		for (const file of localeFiles) {
			try {
				await rm(file, { force: true })
			} catch {
				// 忽略錯誤
			}
		}

		// 刪除 Port 介面
		try {
			if (existsSync(portFile)) {
				await rm(portFile, { force: true })
			}
		} catch {
			// 忽略錯誤
		}

		log.success(`模組已刪除: ${module}`)
		console.log(`\n📝 提醒:`)
		console.log(`   1. 手動移除 app/bootstrap.ts 中對該模組的引用`)
		console.log(`   2. 如果有其他模組依賴此模組，需要更新它們的 import`)
		console.log(`   3. 重新啟動開發伺服器: bun dev\n`)
	} catch (error) {
		throw error
	}
}
