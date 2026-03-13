/**
 * @file scripts/cli/utils.ts
 * @description CLI 工具函式庫
 */

import { mkdir, writeFile, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, resolve } from 'path'
import type { ParsedArgs, CommandContext } from './types'

/**
 * 解析命令行參數
 * @example parseArgs(['event', 'User', 'UserCreated', '--force'])
 * → { positional: ['event', 'User', 'UserCreated'], flags: { force: true } }
 */
export function parseArgs(args: string[]): ParsedArgs {
	const positional: string[] = []
	const flags: Record<string, boolean | string> = {}

	for (const arg of args) {
		if (arg.startsWith('--')) {
			const [key, value] = arg.slice(2).split('=')
			flags[key] = value ?? true
		} else if (arg.startsWith('-')) {
			flags[arg.slice(1)] = true
		} else {
			positional.push(arg)
		}
	}

	return { positional, flags }
}

/**
 * 轉換為 PascalCase
 * @example toPascalCase('user-profile') → 'UserProfile'
 * @example toPascalCase('UserProfile') → 'UserProfile'
 * @example toPascalCase('user_profile') → 'UserProfile'
 */
export function toPascalCase(str: string): string {
	// 如果已經是 PascalCase，直接返回
	if (/^[A-Z][a-zA-Z0-9]*$/.test(str)) {
		return str
	}
	// 分割並轉換
	return str
		.replace(/([a-z])([A-Z])/g, '$1-$2') // 在小寫和大寫之間添加分隔符
		.split(/[-_\s]+/)
		.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join('')
}

/**
 * 轉換為 camelCase
 * @example toCamelCase('UserProfile') → 'userProfile'
 */
export function toCamelCase(str: string): string {
	const pascal = toPascalCase(str)
	return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

/**
 * 轉換為 snake_case
 * @example toSnakeCase('UserProfile') → 'user_profile'
 */
export function toSnakeCase(str: string): string {
	return str
		.replace(/([A-Z])/g, '_$1')
		.toLowerCase()
		.replace(/^_/, '')
}

/**
 * 轉換為表格名稱（snake_case + plural）
 * @example toTableName('Product') → 'products'
 */
export function toTableName(str: string): string {
	const snake = toSnakeCase(str)
	if (snake.endsWith('y')) {
		return snake.slice(0, -1) + 'ies'
	}
	return snake + 's'
}

/**
 * 寫入檔案，自動建立目錄
 */
export async function writeFileWithDir(filePath: string, content: string): Promise<void> {
	const dir = filePath.split('/').slice(0, -1).join('/')
	if (dir) {
		await mkdir(dir, { recursive: true })
	}
	await writeFile(filePath, content, 'utf-8')
}

/**
 * 檢查路徑是否存在（若存在拋出錯誤）
 */
export async function assertNotExists(filePath: string, message?: string): Promise<void> {
	if (existsSync(filePath)) {
		throw new Error(message || `路徑已存在: ${filePath}`)
	}
}

/**
 * 檢查模組是否存在
 */
export async function assertModuleExists(moduleName: string): Promise<void> {
	const modulePath = join('app/Modules', moduleName)
	if (!existsSync(modulePath)) {
		throw new Error(`模組不存在: ${moduleName}`)
	}
}

/**
 * 取得專案根目錄
 */
export function getProjectRoot(): string {
	return resolve(process.cwd())
}

/**
 * 建立命令上下文
 */
export function createCommandContext(moduleName: string): CommandContext {
	const projectRoot = getProjectRoot()
	const pascal = toPascalCase(moduleName)
	const camel = toCamelCase(moduleName)
	const snake = toSnakeCase(pascal)

	return {
		projectRoot,
		moduleName: pascal,
		modulePath: join(projectRoot, 'app/Modules', pascal),
		pascalCase: pascal,
		camelCase: camel,
		snakeCase: snake,
	}
}

/**
 * 找到下一個 Migration 序號
 */
export async function getNextMigrationNumber(): Promise<string> {
	try {
		const files = await readdir('database/migrations')
		const numbers = files
			.map(f => parseInt(f.split('_')[0]))
			.filter(Boolean)
			.sort((a, b) => b - a)

		const next = (numbers[0] || 0) + 1
		return String(next).padStart(3, '0')
	} catch {
		return '001'
	}
}

/**
 * 列出所有模組
 */
export async function listModules(): Promise<string[]> {
	try {
		const files = await readdir('app/Modules')
		return files.sort()
	} catch {
		return []
	}
}

/**
 * 確認對話框（簡單實現）
 */
export async function confirm(message: string): Promise<boolean> {
	if (process.stdin.isTTY === false) {
		return false
	}
	console.log(message)
	// 在 Bun 環境中使用 prompt
	const answer = prompt('(y/n): ')?.toLowerCase()
	return answer === 'y' || answer === 'yes'
}

/**
 * 格式化輸出訊息
 */
export const log = {
	success: (msg: string) => console.log(`✅ ${msg}`),
	error: (msg: string) => console.error(`❌ ${msg}`),
	info: (msg: string) => console.log(`ℹ️  ${msg}`),
	warn: (msg: string) => console.warn(`⚠️  ${msg}`),
}
