#!/usr/bin/env bun
/**
 * @file scripts/make.ts
 * @description 統一的 DDD 生成器 CLI 入口
 *
 * 使用方式:
 *   bun make module <Name>              - 生成完整 DDD 模組
 *   bun make event <Module> <EventName> - 新增 Domain Event
 *   bun make vo <Module> <VOName>       - 新增 Value Object
 *   bun make service <Module> <ServiceName> - 新增 Application Service
 *   bun make dto <Module> <DTOName>     - 新增 DTO
 *   bun make migration <Name>           - 自動序號 migration（代理 bun orbit）
 *   bun make controller <Module>        - 生成控制器（代理 bun gravito）
 *   bun make middleware <Name>          - 生成 Middleware（代理 bun gravito）
 *   bun make list                       - 列出所有模組及狀態
 *   bun make remove <Module>            - 安全刪除模組（確認後執行）
 *   bun make check                      - 檢查所有模組的架構邊界規則
 */

import { log } from './cli/utils'

const [subcommand, ...rest] = process.argv.slice(2)

const handlers: Record<string, () => Promise<void>> = {
	module: () => import('./cli/commands/make-module').then(m => m.run(rest)),
	event: () => import('./cli/commands/make-event').then(m => m.run(rest)),
	vo: () => import('./cli/commands/make-vo').then(m => m.run(rest)),
	service: () => import('./cli/commands/make-service').then(m => m.run(rest)),
	dto: () => import('./cli/commands/make-dto').then(m => m.run(rest)),
	migration: () => import('./cli/commands/make-proxy').then(m => m.migration(rest)),
	controller: () => import('./cli/commands/make-proxy').then(m => m.controller(rest)),
	middleware: () => import('./cli/commands/make-proxy').then(m => m.middleware(rest)),
	list: () => import('./cli/commands/make-list').then(m => m.run(rest)),
	remove: () => import('./cli/commands/make-remove').then(m => m.run(rest)),
	check: () => import('./cli/commands/make-check').then(m => m.run(rest)),
}

async function main() {
	if (!subcommand || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
		showHelp()
		process.exit(0)
	}

	const handler = handlers[subcommand]

	if (!handler) {
		log.error(`未知的子命令: ${subcommand}`)
		showHelp()
		process.exit(1)
	}

	try {
		await handler()
	} catch (error) {
		log.error((error as Error).message)
		process.exit(1)
	}
}

function showHelp() {
	const help = `
📦 DDD 架構生成器 CLI

用法: bun make <subcommand> [args] [flags]

子命令:
  module <Name>                    生成完整 DDD 模組
  event <Module> <EventName>       新增 Domain Event
  vo <Module> <VOName>             新增 Value Object
  service <Module> <ServiceName>   新增 Application Service
  dto <Module> <DTOName>           新增 DTO
  migration <Name>                 自動序號 migration（代理 bun orbit）
  controller <Module>              生成控制器（代理 bun gravito）
  middleware <Name>                生成 Middleware（代理 bun gravito）
  list                             列出所有模組及狀態
  remove <Module>                  安全刪除模組（確認後執行）
  check                            檢查所有模組的架構邊界規則

範例:
  bun make module Product
  bun make event Order OrderPlaced
  bun make vo Product ProductId
  bun make service Cart AddToCartService
  bun make dto Product ProductDTO
  bun make migration add_slug_to_posts
  bun make list
  bun make check
  bun make remove Blog

選項:
  --help, -h                       顯示此幫助訊息
`

	console.log(help)
}

main()
