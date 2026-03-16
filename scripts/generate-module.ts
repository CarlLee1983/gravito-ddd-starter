#!/usr/bin/env bun
/**
 * 自定義模組生成器 (強型別與 Auto-Wiring 支援版)
 *
 * 確保生成的模組遵循：
 * 1. 強型別 Entity (繼承 BaseEntity)
 * 2. 強型別 Repository (繼承 IRepository<T>)
 * 3. 自動掃描裝配 (Auto-Wiring) 機制
 */

import { argv } from 'process'
import { mkdir, writeFile, readdir } from 'fs/promises'
import { join } from 'path'

const moduleName = argv[2]
const flags = {
	redis: argv.includes('--redis'),
	cache: argv.includes('--cache'),
	db: argv.includes('--db'),
	migration: argv.includes('--migration'),
}

if (!moduleName) {
	console.error('❌ 錯誤：請提供模組名稱')
	console.error('用法: bun scripts/generate-module.ts <ModuleName> [--redis] [--cache] [--db] [--migration]')
	process.exit(1)
}

const pascalCase = moduleName.charAt(0).toUpperCase() + moduleName.slice(1)
const modulePath = join('app/Modules', pascalCase)

async function generateModule() {
	try {
		console.log(`📦 生成模組: ${pascalCase}...`)

		// 創建目錄結構
		const dirs = [
			'Domain/Aggregates',
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

		// 1. 生成 Entity/Aggregate
		const entityContent = `import { BaseEntity } from '@/Foundation/Domain/BaseEntity'

export interface ${pascalCase}Props {
	id: string
	name: string
	createdAt: Date
}

export class ${pascalCase} extends BaseEntity {
	private constructor(private props: ${pascalCase}Props) {
		super(props.id)
	}

	static create(id: string, name: string): ${pascalCase} {
		return new ${pascalCase}({
			id,
			name,
			createdAt: new Date(),
		})
	}

	static fromDatabase(data: any): ${pascalCase} {
		return new ${pascalCase}({
			id: data.id,
			name: data.name,
			createdAt: data.created_at ? new Date(data.created_at) : new Date(),
		})
	}

	get name(): string {
		return this.props.name
	}
}
`
		await writeFile(join(modulePath, `Domain/Aggregates/${pascalCase}.ts`), entityContent)

		// 2. 生成 Repository 介面
		const iRepository = `import type { IRepository } from '@/Foundation/Domain/IRepository'
import { ${pascalCase} } from '../Aggregates/${pascalCase}'

export interface I${pascalCase}Repository extends IRepository<${pascalCase}> {
	findByName(name: string): Promise<${pascalCase} | null>
}
`
		await writeFile(join(modulePath, `Domain/Repositories/I${pascalCase}Repository.ts`), iRepository)

		// 3. 生成 Repository 實作
		const repository = flags.db 
		? `import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { I${pascalCase}Repository } from '../../Domain/Repositories/I${pascalCase}Repository'
import { ${pascalCase} } from '../../Domain/Aggregates/${pascalCase}'

export class ${pascalCase}Repository implements I${pascalCase}Repository {
	constructor(private db: IDatabaseAccess) {}

	async findAll(params?: { limit?: number; offset?: number }): Promise<${pascalCase}[]> {
		let query = this.db.table('${moduleName.toLowerCase()}s')
		if (params?.limit) query = query.limit(params.limit)
		if (params?.offset) query = query.offset(params.offset)
		const rows = await query.select()
		return rows.map(row => this.toDomain(row))
	}

	async findById(id: string): Promise<${pascalCase} | null> {
		const row = await this.db.table('${moduleName.toLowerCase()}s').where('id', '=', id).first()
		return row ? this.toDomain(row) : null
	}

	async save(entity: ${pascalCase}): Promise<void> {
		const row = this.toRow(entity)
		const exists = await this.findById(entity.id)
		if (exists) {
			await this.db.table('${moduleName.toLowerCase()}s').where('id', '=', entity.id).update(row)
		} else {
			await this.db.table('${moduleName.toLowerCase()}s').insert(row)
		}
	}

	async delete(id: string): Promise<void> {
		await this.db.table('${moduleName.toLowerCase()}s').where('id', '=', id).delete()
	}

	async count(): Promise<number> {
		return this.db.table('${moduleName.toLowerCase()}s').count()
	}

	async findByName(name: string): Promise<${pascalCase} | null> {
		const row = await this.db.table('${moduleName.toLowerCase()}s').where('name', '=', name).first()
		return row ? this.toDomain(row) : null
	}

	private toDomain(row: any): ${pascalCase} {
		return ${pascalCase}.fromDatabase(row)
	}

	private toRow(entity: ${pascalCase}): any {
		return {
			id: entity.id,
			name: entity.name,
			created_at: new Date().toISOString(),
		}
	}
}
`
		: `import type { I${pascalCase}Repository } from '../../Domain/Repositories/I${pascalCase}Repository'
import { ${pascalCase} } from '../../Domain/Aggregates/${pascalCase}'

export class ${pascalCase}Repository implements I${pascalCase}Repository {
	private data: Map<string, ${pascalCase}> = new Map()

	async findAll(): Promise<${pascalCase}[]> {
		return Array.from(this.data.values())
	}

	async findById(id: string): Promise<${pascalCase} | null> {
		return this.data.get(id) || null
	}

	async save(entity: ${pascalCase}): Promise<void> {
		this.data.set(entity.id, entity)
	}

	async delete(id: string): Promise<void> {
		this.data.delete(id)
	}

	async count(): Promise<number> {
		return this.data.size
	}

	async findByName(name: string): Promise<${pascalCase} | null> {
		return Array.from(this.data.values()).find(e => e.name === name) || null
	}
}
`
		await writeFile(join(modulePath, `Infrastructure/Repositories/${pascalCase}Repository.ts`), repository)

		// 4. 生成註冊器 (registerRepositories)
		const registerRepos = `import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import { ${pascalCase}Repository } from '../Repositories/${pascalCase}Repository'
import { getRegistry } from '@wiring/RepositoryRegistry'

export function register${pascalCase}Repositories(db: IDatabaseAccess): void {
	const registry = getRegistry()
	registry.register('${moduleName.toLowerCase()}', () => {
		return new ${pascalCase}Repository(db)
	})
}
`
		await writeFile(join(modulePath, `Infrastructure/Providers/register${pascalCase}Repositories.ts`), registerRepos)

		// 5. 生成 ServiceProvider
		const serviceProvider = `import { ModuleServiceProvider, type IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import { getRegistry } from '@wiring/RepositoryRegistry'
import { getCurrentORM, getDatabaseAccess } from '@wiring/RepositoryFactory'

export class ${pascalCase}ServiceProvider extends ModuleServiceProvider {
	override register(container: IContainer): void {
		container.singleton('${moduleName.toLowerCase()}Repository', () => {
			const registry = getRegistry()
			const orm = getCurrentORM()
			const db = orm !== 'memory' ? getDatabaseAccess() : undefined
			return registry.create('${moduleName.toLowerCase()}', orm, db)
		})
	}

	override boot(_context: any): void {
		console.log('✨ [${pascalCase}] Module loaded')
	}
}
`
		await writeFile(join(modulePath, `Infrastructure/Providers/${pascalCase}ServiceProvider.ts`), serviceProvider)

		// 6. 生成 Controller
		const controller = `import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { I${pascalCase}Repository } from '../../Domain/Repositories/I${pascalCase}Repository'

export class ${pascalCase}Controller {
	constructor(private repository: I${pascalCase}Repository) {}

	async index(ctx: IHttpContext): Promise<Response> {
		const items = await this.repository.findAll()
		return ctx.json({ success: true, data: items })
	}

	async show(ctx: IHttpContext): Promise<Response> {
		const item = await this.repository.findById(ctx.params.id!)
		if (!item) return ctx.json({ success: false, message: 'Not found' }, 404)
		return ctx.json({ success: true, data: item })
	}
}
`
		await writeFile(join(modulePath, `Presentation/Controllers/${pascalCase}Controller.ts`), controller)

		// 7. 生成 Routes
		const routes = `import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import type { ${pascalCase}Controller } from '../Controllers/${pascalCase}Controller'

export function register${pascalCase}Routes(router: IModuleRouter, controller: ${pascalCase}Controller): void {
	router.get('/api/${moduleName.toLowerCase()}', (ctx) => controller.index(ctx))
	router.get('/api/${moduleName.toLowerCase()}/:id', (ctx) => controller.show(ctx))
}
`
		await writeFile(join(modulePath, `Presentation/Routes/${moduleName.toLowerCase()}.routes.ts`), routes)

		// 8. 生成 index.ts (Auto-Wiring Entry)
		const index = `import type { IModuleDefinition } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import { ${pascalCase}ServiceProvider } from './Infrastructure/Providers/${pascalCase}ServiceProvider'
import { register${pascalCase}Repositories } from './Infrastructure/Providers/register${pascalCase}Repositories'
import { ${pascalCase}Controller } from './Presentation/Controllers/${pascalCase}Controller'
import { register${pascalCase}Routes } from './Presentation/Routes/${moduleName.toLowerCase()}.routes'
import { createGravitoModuleRouter } from '@/Foundation/Infrastructure/Adapters/Gravito/GravitoModuleRouter'

export const ${pascalCase}Module: IModuleDefinition = {
	name: '${pascalCase}',
	provider: ${pascalCase}ServiceProvider,
	registerRepositories: register${pascalCase}Repositories,
	registerRoutes: (core) => {
		const repository = core.container.make('${moduleName.toLowerCase()}Repository')
		const controller = new ${pascalCase}Controller(repository)
		const router = createGravitoModuleRouter(core)
		register${pascalCase}Routes(router, controller)
	}
}
`
		await writeFile(join(modulePath, 'index.ts'), index)

		console.log(`\n✅ 模組 ${pascalCase} 生成成功！已經配置為 Auto-Wiring。`)
	} catch (error) {
		console.error('❌ 生成失敗:', error)
	}
}

generateModule()
