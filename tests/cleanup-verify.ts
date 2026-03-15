/**
 * @file tests/cleanup-verify.ts
 * @description 測試後清理驗證
 *
 * 用途：
 * - 確認沒有遺留的 DB 檔案
 * - 驗證副作用資產已清理
 * - 可在 CI/CD 中作為最後檢查
 *
 * @usage
 * ```bash
 * # 執行所有測試後驗證清理
 * bun test && bun run tests/cleanup-verify.ts
 *
 * # 或在 package.json 中添加
 * "test": "bun test && node tests/cleanup-verify.ts"
 * ```
 */

import { existsSync, readdirSync, statSync } from 'fs'
import { resolve } from 'path'

const PROJECT_ROOT = process.cwd()

/**
 * 應被忽略的 DB 位置
 */
const FORBIDDEN_DB_LOCATIONS = [
	'./gravito.db',
	'./test.db',
	'./storage/test.db',
	'./storage/local.db',
	'./storage/**/*.db',
	'./database/*.db',
	'./database/*.sqlite',
]

/**
 * 應被清理的臨時目錄
 */
const TEMP_DIRS = [
	'./storage/tmp',
	'./storage/framework/cache',
]

/**
 * 檢查單個檔案
 */
function checkFile(filePath: string): boolean {
	const fullPath = resolve(PROJECT_ROOT, filePath)
	return existsSync(fullPath)
}

/**
 * 檢查目錄內容
 */
function checkDirectory(dirPath: string): string[] {
	const fullPath = resolve(PROJECT_ROOT, dirPath)
	if (!existsSync(fullPath)) {
		return []
	}

	const files: string[] = []
	try {
		const entries = readdirSync(fullPath)
		for (const entry of entries) {
			const entryPath = resolve(fullPath, entry)
			const stat = statSync(entryPath)

			if (entry.endsWith('.db') || entry.endsWith('.sqlite')) {
				files.push(entry)
			}

			// 遞迴檢查子目錄
			if (stat.isDirectory()) {
				const subFiles = checkDirectory(resolve(dirPath, entry))
				files.push(...subFiles.map((f) => `${entry}/${f}`))
			}
		}
	} catch (error) {
		// 忽略無法讀取的目錄
	}

	return files
}

/**
 * 主驗證邏輯
 */
function verifyCleanup(): { success: boolean; errors: string[] } {
	const errors: string[] = []

	console.log('\n🔍 驗證測試隔離清理...\n')

	// 檢查禁止位置
	console.log('📋 檢查禁止的 DB 位置...')
	for (const location of FORBIDDEN_DB_LOCATIONS) {
		if (location.includes('**')) {
			// 處理 glob 模式
			const basePath = location.replace('/**/*', '')
			const dbFiles = checkDirectory(basePath)
			if (dbFiles.length > 0) {
				errors.push(`❌ 在 ${basePath} 發現 DB 檔案: ${dbFiles.join(', ')}`)
			} else {
				console.log(`  ✅ ${basePath}/ 無 DB 檔案`)
			}
		} else {
			if (checkFile(location)) {
				errors.push(`❌ 發現禁止的 DB 檔案: ${location}`)
			} else {
				console.log(`  ✅ ${location} 不存在`)
			}
		}
	}

	// 檢查臨時目錄
	console.log('\n📋 檢查臨時目錄...')
	for (const dir of TEMP_DIRS) {
		const tempFiles = checkDirectory(dir)
		if (tempFiles.length > 0) {
			console.log(`  ⚠️  ${dir}/ 有 ${tempFiles.length} 個臨時檔案（無影響）`)
		} else {
			console.log(`  ✅ ${dir}/ 已清理`)
		}
	}

	return {
		success: errors.length === 0,
		errors,
	}
}

/**
 * 列印驗證結果
 */
function printResults(result: { success: boolean; errors: string[] }) {
	console.log('\n' + '='.repeat(60))

	if (result.success) {
		console.log('✅ 測試隔離驗證通過')
		console.log('\n✨ 沒有檢測到副作用資產')
		console.log('✨ 所有 DB 檔案已正確清理\n')
		return 0
	} else {
		console.log('❌ 測試隔離驗證失敗\n')
		console.log('發現問題：')
		result.errors.forEach((error) => console.log(`  ${error}`))
		console.log(
			'\n💡 提示：檢查 DATABASE_TESTING_STRATEGY.md 了解隔離機制'
		)
		console.log('💡 可能原因：'
		console.log('  - 測試中有 beforeEach/afterEach 不完整')
		console.log('  - 沒有使用 cleanupTestDatabase() 清理 DB')
		console.log('  - 使用磁碟 DB 而不是內存 DB\n')
		return 1
	}
}

// 執行驗證
const result = verifyCleanup()
const exitCode = printResults(result)
process.exit(exitCode)
