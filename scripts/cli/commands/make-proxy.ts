/**
 * @file scripts/cli/commands/make-proxy.ts
 * @description 代理 bun orbit 和 bun gravito 命令
 */

import { spawn } from 'bun'
import { getNextMigrationNumber, log, parseArgs } from '../utils'

/**
 * 代理 bun orbit make:migration
 * 自動添加序號前綴
 */
export async function migration(args: string[]) {
	const { positional } = parseArgs(args)
	const migrationName = positional[0]

	if (!migrationName) {
		throw new Error('❌  錯誤：請提供 migration 名稱\n用法: bun make migration <Name>')
	}

	try {
		const number = await getNextMigrationNumber()
		const fullName = `${number}_${migrationName.replace(/\s+/g, '_')}`

		log.info(`生成 migration: ${fullName}`)

		// 代理到 bun orbit
		const proc = spawn(['bun', 'orbit', 'make:migration', fullName], {
			stdio: 'inherit',
		})

		const code = await proc.exited
		if (code !== 0) {
			throw new Error(`Migration 生成失敗 (exit code: ${code})`)
		}

		log.success(`Migration 生成成功: ${fullName}`)
	} catch (error) {
		throw error
	}
}

/**
 * 代理 bun gravito make:controller
 */
export async function controller(args: string[]) {
	const { positional } = parseArgs(args)
	const controllerName = positional[0]

	if (!controllerName) {
		throw new Error('❌ 錯誤：請提供控制器名稱\n用法: bun make controller <Name>')
	}

	try {
		log.info(`生成控制器: ${controllerName}`)

		const proc = spawn(['bun', 'gravito', 'make:controller', controllerName], {
			stdio: 'inherit',
		})

		const code = await proc.exited
		if (code !== 0) {
			throw new Error(`控制器生成失敗 (exit code: ${code})`)
		}

		log.success(`控制器生成成功: ${controllerName}`)
	} catch (error) {
		throw error
	}
}

/**
 * 代理 bun gravito make:middleware
 */
export async function middleware(args: string[]) {
	const { positional } = parseArgs(args)
	const middlewareName = positional[0]

	if (!middlewareName) {
		throw new Error('❌ 錯誤：請提供 middleware 名稱\n用法: bun make middleware <Name>')
	}

	try {
		log.info(`生成 middleware: ${middlewareName}`)

		const proc = spawn(['bun', 'gravito', 'make:middleware', middlewareName], {
			stdio: 'inherit',
		})

		const code = await proc.exited
		if (code !== 0) {
			throw new Error(`Middleware 生成失敗 (exit code: ${code})`)
		}

		log.success(`Middleware 生成成功: ${middlewareName}`)
	} catch (error) {
		throw error
	}
}
