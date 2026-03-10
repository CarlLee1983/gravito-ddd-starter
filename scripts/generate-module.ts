#!/usr/bin/env bun
/**
 * 自定義模組生成器
 *
 * 確保生成的模組遵循框架無關的架構模式：
 * - Routes 接收 IModuleRouter + controller（無容器耦合）
 * - Controllers 接收 IHttpContext（無 GravitoContext 耦合）
 * - ServiceProvider 只負責領域服務依賴
 * - Wiring 層負責適配器 + DI 組裝
 *
 * 用法: bun scripts/generate-module.ts <ModuleName>
 * 示例: bun scripts/generate-module.ts Product
 */

import { argv } from 'process'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

const moduleName = argv[2]

if (!moduleName) {
	console.error('❌ 錯誤：請提供模組名稱')
	console.error('用法: bun scripts/generate-module.ts <ModuleName>')
	process.exit(1)
}

const pascalCase = moduleName.charAt(0).toUpperCase() + moduleName.slice(1)
const modulePath = join('src/Modules', pascalCase)

async function generateModule() {
	try {
		console.log(`📦 生成模組: ${pascalCase}...`)

		// 創建目錄結構
		const dirs = [
			'Domain/Entities',
			'Domain/ValueObjects',
			'Domain/Repositories',
			'Domain/Services',
			'Application/Services',
			'Application/DTOs',
			'Presentation/Controllers',
			'Presentation/Routes',
			'Infrastructure/Repositories',
			'Infrastructure/Providers',
			'tests',
		]

		for (const dir of dirs) {
			await mkdir(join(modulePath, dir), { recursive: true })
			console.log(`  ✓ ${dir}`)
		}

		// 生成 Repository 介面
		const iRepository = `/**
 * I${pascalCase}Repository
 * ${pascalCase} 倉庫介面（倒依賴）
 */

export interface I${pascalCase}Repository {
	findAll(): Promise<any[]>
	findById(id: string): Promise<any | null>
	save(entity: any): Promise<void>
	delete(id: string): Promise<void>
}
`
		await writeFile(
			join(modulePath, `Domain/Repositories/I${pascalCase}Repository.ts`),
			iRepository,
		)
		console.log(`  ✓ Domain/Repositories/I${pascalCase}Repository.ts`)

		// 生成 Repository 實現
		const repository = `/**
 * ${pascalCase}Repository
 * ${pascalCase} 倉庫實現（Infrastructure 層）
 */

import type { I${pascalCase}Repository } from '../../Domain/Repositories/I${pascalCase}Repository'

export class ${pascalCase}Repository implements I${pascalCase}Repository {
	private data: Map<string, any> = new Map()

	async findAll(): Promise<any[]> {
		return Array.from(this.data.values())
	}

	async findById(id: string): Promise<any | null> {
		return this.data.get(id) || null
	}

	async save(entity: any): Promise<void> {
		this.data.set(entity.id, entity)
	}

	async delete(id: string): Promise<void> {
		this.data.delete(id)
	}
}
`
		await writeFile(
			join(modulePath, `Infrastructure/Repositories/${pascalCase}Repository.ts`),
			repository,
		)
		console.log(`  ✓ Infrastructure/Repositories/${pascalCase}Repository.ts`)

		// 生成 ServiceProvider
		const serviceProvider = `/**
 * ${pascalCase}ServiceProvider
 * 配置 ${pascalCase} 模組的依賴
 */

import { ServiceProvider, type Container, type PlanetCore } from '@gravito/core'
import { ${pascalCase}Repository } from '../Repositories/${pascalCase}Repository'

export class ${pascalCase}ServiceProvider extends ServiceProvider {
	register(container: Container): void {
		// 註冊 Repository (單例)
		container.singleton('${moduleName}Repository', () => {
			return new ${pascalCase}Repository()
		})
	}

	boot(_core: PlanetCore): void {
		console.log('✨ [${pascalCase}] Module loaded')
	}
}
`
		await writeFile(
			join(modulePath, `Infrastructure/Providers/${pascalCase}ServiceProvider.ts`),
			serviceProvider,
		)
		console.log(`  ✓ Infrastructure/Providers/${pascalCase}ServiceProvider.ts`)

		// 生成 Controller（框架無關）
		const controller = `/**
 * ${pascalCase}Controller
 *
 * 設計原則：
 * - 依賴通過構造函數注入
 * - 使用 IHttpContext 而不是 GravitoContext（框架無關）
 * - 不訪問任何容器或框架對象
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { I${pascalCase}Repository } from '../../Domain/Repositories/I${pascalCase}Repository'

export class ${pascalCase}Controller {
	constructor(private repository: I${pascalCase}Repository) {}

	async index(ctx: IHttpContext): Promise<Response> {
		try {
			const items = await this.repository.findAll()
			return ctx.json({
				success: true,
				data: items,
			})
		} catch (error: any) {
			return ctx.json(
				{
					success: false,
					message: error.message || 'Failed to list items',
				},
				500,
			)
		}
	}

	async show(ctx: IHttpContext): Promise<Response> {
		try {
			const id = ctx.params.id
			if (!id) {
				return ctx.json(
					{
						success: false,
						message: 'ID is required',
					},
					400,
				)
			}

			const item = await this.repository.findById(id)
			if (!item) {
				return ctx.json(
					{
						success: false,
						message: 'Item not found',
					},
					404,
				)
			}

			return ctx.json({
				success: true,
				data: item,
			})
		} catch (error: any) {
			return ctx.json(
				{
					success: false,
					message: error.message || 'Failed to get item',
				},
				500,
			)
		}
	}

	async store(ctx: IHttpContext): Promise<Response> {
		try {
			const body = await ctx.getJsonBody<any>()
			// TODO: 添加數據驗證和模型創建邏輯
			return ctx.json(
				{
					success: true,
					message: 'Item created successfully',
					data: body,
				},
				201,
			)
		} catch (error: any) {
			return ctx.json(
				{
					success: false,
					message: error.message || 'Failed to create item',
				},
				400,
			)
		}
	}
}
`
		await writeFile(
			join(modulePath, `Presentation/Controllers/${pascalCase}Controller.ts`),
			controller,
		)
		console.log(`  ✓ Presentation/Controllers/${pascalCase}Controller.ts`)

		// 生成 Routes（框架無關）
		const routes = `/**
 * ${pascalCase}Routes
 * ${pascalCase} 模組的路由定義（框架無關）
 *
 * 路由層只負責：
 * 1. 接收已組裝的 controller（依賴注入已完成）
 * 2. 接收框架無關的 IModuleRouter（適配層在 wiring 層完成）
 * 3. 定義路由與 controller 方法的映射
 */

import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { ${pascalCase}Controller } from '../Controllers/${pascalCase}Controller'

/**
 * 註冊 ${pascalCase} 路由
 *
 * @param router - 框架無關的模組路由介面
 * @param controller - 已組裝的控制器實例（依賴已注入）
 */
export function register${pascalCase}Routes(
	router: IModuleRouter,
	controller: ${pascalCase}Controller,
): void {
	router.get('/api/${moduleName}', (ctx) => controller.index(ctx))
	router.get('/api/${moduleName}/:id', (ctx) => controller.show(ctx))
	router.post('/api/${moduleName}', (ctx) => controller.store(ctx))
}
`
		await writeFile(
			join(modulePath, `Presentation/Routes/${moduleName}.routes.ts`),
			routes,
		)
		console.log(`  ✓ Presentation/Routes/${moduleName}.routes.ts`)

		// 生成 index.ts
		const index = `/**
 * ${pascalCase} Module
 * 公開 API 導出
 */

// Domain
export type { I${pascalCase}Repository } from './Domain/Repositories/I${pascalCase}Repository'

// Presentation
export { register${pascalCase}Routes } from './Presentation/Routes/${moduleName}.routes'
export { ${pascalCase}Controller } from './Presentation/Controllers/${pascalCase}Controller'

// Infrastructure
export { ${pascalCase}Repository } from './Infrastructure/Repositories/${pascalCase}Repository'
export { ${pascalCase}ServiceProvider } from './Infrastructure/Providers/${pascalCase}ServiceProvider'
`
		await writeFile(join(modulePath, 'index.ts'), index)
		console.log(`  ✓ index.ts`)

		// 生成 README.md
		const readme = `# ${pascalCase} Module

${pascalCase} 模組 - DDD 實現。

## 架構

\`\`\`
${pascalCase}/
├── Domain/
│   ├── Entities/
│   ├── ValueObjects/
│   ├── Repositories/
│   │   └── I${pascalCase}Repository.ts
│   └── Services/
├── Application/
│   ├── Services/
│   └── DTOs/
├── Presentation/
│   ├── Controllers/
│   │   └── ${pascalCase}Controller.ts
│   └── Routes/
│       └── ${moduleName}.routes.ts
├── Infrastructure/
│   ├── Repositories/
│   │   └── ${pascalCase}Repository.ts
│   └── Providers/
│       └── ${pascalCase}ServiceProvider.ts
├── tests/
├── index.ts
└── README.md
\`\`\`

## 使用

1. 註冊 ServiceProvider 在 \`src/app.ts\`
2. 在 \`src/wiring/index.ts\` 中添加 \`register${pascalCase}\` 函式
3. 在 \`src/routes.ts\` 中調用 \`register${pascalCase}(core)\`

## 框架無關設計

- Routes 接收 \`IModuleRouter\` + \`controller\`
- Controllers 接收 \`IHttpContext\`（不依賴 \`GravitoContext\`）
- 未來換框架只需修改 \`adapters/\`
`
		await writeFile(join(modulePath, 'README.md'), readme)
		console.log(`  ✓ README.md`)

		console.log(`\n✅ 模組 ${pascalCase} 生成成功！`)
		console.log(`\n📝 後續步驟：`)
		console.log(`1. 在 src/app.ts 中註冊 ${pascalCase}ServiceProvider`)
		console.log(`2. 在 src/wiring/index.ts 中添加 register${pascalCase}() 函式`)
		console.log(`3. 在 src/routes.ts 中調用 register${pascalCase}(core)`)
		console.log(`4. 根據需要修改 Domain/、Application/ 層的實現`)
	} catch (error) {
		console.error('❌ 生成失敗:', error)
		process.exit(1)
	}
}

generateModule()
