/**
 * @file scripts/cli/commands/make-module.ts
 * @description make module <Name> - 生成完整 DDD 模組
 */

import {
	parseArgs,
	toPascalCase,
	toCamelCase,
	toSnakeCase,
	toTableName,
	writeFileWithDir,
	assertNotExists,
	log,
	createCommandContext,
} from '../utils'

export async function run(args: string[]) {
	const { positional } = parseArgs(args)
	const moduleName = positional[0]

	if (!moduleName) {
		throw new Error('❌ 錯誤：請提供模組名稱\n用法: bun make module <Name>')
	}

	const ctx = createCommandContext(moduleName)

	// 檢查模組是否已存在
	await assertNotExists(ctx.modulePath, `模組已存在: ${ctx.moduleName}`)

	console.log(`\n📦 生成模組: ${ctx.pascalCase}...`)

	try {
		// 生成 18 個檔案
		await generateAggregate(ctx)
		await generateValueObjects(ctx)
		await generateEvent(ctx)
		await generateRepositoryInterface(ctx)
		await generateApplicationServices(ctx)
		await generateDTOs(ctx)
		await generateRepository(ctx)
		await generateServiceProvider(ctx)
		await generateRegisterRepositories(ctx)
		await generateMessageService(ctx)
		await generateController(ctx)
		await generateRoutes(ctx)
		await generateWiring(ctx)
		await generateModuleIndex(ctx)
		await generateMessagePort(ctx)
		await generateLocales(ctx)
		await generateREADME(ctx)

		log.success(`模組 ${ctx.pascalCase} 生成成功！`)
		console.log(`\n📂 位置: app/Modules/${ctx.pascalCase}`)
		console.log(`\n✨ 下一步:`)
		console.log(`   1. 編輯 Domain/Aggregates/${ctx.pascalCase}.ts 添加業務邏輯`)
		console.log(`   2. 編輯 Infrastructure/Providers/${ctx.pascalCase}ServiceProvider.ts 註冊依賴`)
		console.log(`   3. 編輯 Presentation/Controllers/${ctx.pascalCase}Controller.ts 實現端點`)
		console.log(`   4. bun make event ${ctx.pascalCase} ${ctx.pascalCase}Created - 添加領域事件`)
		console.log(`   5. bun make vo ${ctx.pascalCase} ${ctx.pascalCase}Id - 添加值物件\n`)
	} catch (error) {
		log.error(`生成失敗: ${(error as Error).message}`)
		throw error
	}
}

async function generateAggregate(ctx: any) {
	const content = `/**
 * @file ${ctx.pascalCase}.ts
 * @description ${ctx.pascalCase} 聚合根
 */

import { AggregateRoot } from '@/Shared/Domain/AggregateRoot'
import { ${ctx.pascalCase}Created } from '../Events/${ctx.pascalCase}Created'
import type { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * ${ctx.pascalCase} 聚合根
 *
 * 代表系統中的 ${ctx.pascalCase} 業務實體。
 * 所有狀態變更均通過事件驅動。
 */
export class ${ctx.pascalCase} extends AggregateRoot {
	private _name?: string
	protected _createdAt!: Date

	private constructor(id: string) {
		super(id)
	}

	/**
	 * 建立新的 ${ctx.pascalCase}（產生事件）
	 */
	static create(id: string, name: string): ${ctx.pascalCase} {
		const ${ctx.camelCase} = new ${ctx.pascalCase}(id)
		const createdAt = new Date()

		${ctx.camelCase}.raiseEvent(new ${ctx.pascalCase}Created(id, name, createdAt))

		return ${ctx.camelCase}
	}

	/**
	 * 從儲存的資料還原聚合根（無事件）
	 */
	static reconstitute(id: string, name: string, createdAt: Date): ${ctx.pascalCase} {
		const ${ctx.camelCase} = new ${ctx.pascalCase}(id)
		${ctx.camelCase}._name = name
		${ctx.camelCase}._createdAt = createdAt
		return ${ctx.camelCase}
	}

	/**
	 * 應用領域事件到聚合根
	 */
	applyEvent(event: DomainEvent): void {
		if (event.constructor.name === '${ctx.pascalCase}Created') {
			this._name = (event as any).name
			this._createdAt = (event as any).createdAt
		}
	}

	get name(): string | undefined {
		return this._name
	}

	get createdAt(): Date {
		return this._createdAt
	}
}
`
	await writeFileWithDir(`${ctx.modulePath}/Domain/Aggregates/${ctx.pascalCase}.ts`, content)
}

async function generateValueObjects(ctx: any) {
	const idContent = `/**
 * @file ${ctx.pascalCase}Id.ts
 * @description ${ctx.pascalCase} 標識值物件
 */

import { ValueObject } from '@/Shared/Domain/ValueObject'

interface ${ctx.pascalCase}IdProps extends Record<string, unknown> {
	readonly value: string
}

export class ${ctx.pascalCase}Id extends ValueObject<${ctx.pascalCase}IdProps> {
	private constructor(props: ${ctx.pascalCase}IdProps) {
		super(props)
	}

	static create(value: string): ${ctx.pascalCase}Id {
		if (!value || value.trim().length === 0) {
			throw new Error('${ctx.pascalCase} ID 不能為空')
		}
		return new ${ctx.pascalCase}Id({ value: value.trim() })
	}

	get value(): string {
		return this.props.value
	}

	toString(): string {
		return this.props.value
	}
}
`
	await writeFileWithDir(
		`${ctx.modulePath}/Domain/ValueObjects/${ctx.pascalCase}Id.ts`,
		idContent
	)
}

async function generateEvent(ctx: any) {
	const content = `/**
 * @file ${ctx.pascalCase}Created.ts
 * @description ${ctx.pascalCase} 建立事件
 */

import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class ${ctx.pascalCase}Created extends DomainEvent {
	constructor(
		public readonly id: string,
		public readonly name: string,
		public readonly createdAt: Date
	) {
		super(id, '${ctx.pascalCase}Created', { name, createdAt: createdAt.toISOString() })
	}

	toJSON(): Record<string, unknown> {
		return {
			eventId: this.eventId,
			aggregateId: this.id,
			eventType: this.eventType,
			occurredAt: this.occurredAt.toISOString(),
			version: this.version,
			data: {
				name: this.name,
				createdAt: this.createdAt.toISOString(),
			},
		}
	}
}
`
	await writeFileWithDir(
		`${ctx.modulePath}/Domain/Events/${ctx.pascalCase}Created.ts`,
		content
	)
}

async function generateRepositoryInterface(ctx: any) {
	const content = `/**
 * @file I${ctx.pascalCase}Repository.ts
 * @description ${ctx.pascalCase} Repository 介面
 */

import type { IRepository } from '@/Shared/Domain/IRepository'
import { ${ctx.pascalCase} } from '../Aggregates/${ctx.pascalCase}'

export interface I${ctx.pascalCase}Repository extends IRepository<${ctx.pascalCase}> {
	// 在此添加自訂查詢方法
	// 例如: findByName(name: string): Promise<${ctx.pascalCase} | null>
}
`
	await writeFileWithDir(
		`${ctx.modulePath}/Domain/Repositories/I${ctx.pascalCase}Repository.ts`,
		content
	)
}

async function generateApplicationServices(ctx: any) {
	const createServiceContent = `/**
 * @file Create${ctx.pascalCase}Service.ts
 * @description 建立 ${ctx.pascalCase} 應用服務
 */

import type { I${ctx.pascalCase}Repository } from '../../Domain/Repositories/I${ctx.pascalCase}Repository'
import { ${ctx.pascalCase} } from '../../Domain/Aggregates/${ctx.pascalCase}'

export interface Create${ctx.pascalCase}Input {
	id: string
	name: string
}

export interface Create${ctx.pascalCase}Output {
	id: string
	name: string
	createdAt: Date
}

export class Create${ctx.pascalCase}Service {
	constructor(private repository: I${ctx.pascalCase}Repository) {}

	async execute(input: Create${ctx.pascalCase}Input): Promise<Create${ctx.pascalCase}Output> {
		// 建立聚合根
		const ${ctx.camelCase} = ${ctx.pascalCase}.create(input.id, input.name)

		// 保存到儲存庫
		await this.repository.save(${ctx.camelCase})

		// 返回輸出
		return {
			id: ${ctx.camelCase}.id,
			name: ${ctx.camelCase}.name || '',
			createdAt: ${ctx.camelCase}.createdAt,
		}
	}
}
`
	await writeFileWithDir(
		`${ctx.modulePath}/Application/Services/Create${ctx.pascalCase}Service.ts`,
		createServiceContent
	)

	const getServiceContent = `/**
 * @file Get${ctx.pascalCase}Service.ts
 * @description 取得 ${ctx.pascalCase} 應用服務
 */

import type { I${ctx.pascalCase}Repository } from '../../Domain/Repositories/I${ctx.pascalCase}Repository'

export interface Get${ctx.pascalCase}Output {
	id: string
	name: string | undefined
	createdAt: Date
}

export class Get${ctx.pascalCase}Service {
	constructor(private repository: I${ctx.pascalCase}Repository) {}

	async execute(id: string): Promise<Get${ctx.pascalCase}Output | null> {
		const ${ctx.camelCase} = await this.repository.findById(id)
		if (!${ctx.camelCase}) {
			return null
		}
		return {
			id: ${ctx.camelCase}.id,
			name: ${ctx.camelCase}.name,
			createdAt: ${ctx.camelCase}.createdAt,
		}
	}
}
`
	await writeFileWithDir(
		`${ctx.modulePath}/Application/Services/Get${ctx.pascalCase}Service.ts`,
		getServiceContent
	)
}

async function generateDTOs(ctx: any) {
	const content = `/**
 * @file ${ctx.pascalCase}DTO.ts
 * @description ${ctx.pascalCase} 資料傳輸物件
 */

import type { ${ctx.pascalCase} } from '../../Domain/Aggregates/${ctx.pascalCase}'

export class ${ctx.pascalCase}DTO {
	constructor(
		public id: string,
		public name: string | undefined,
		public createdAt: Date
	) {}

	static fromEntity(entity: ${ctx.pascalCase}): ${ctx.pascalCase}DTO {
		return new ${ctx.pascalCase}DTO(entity.id, entity.name, entity.createdAt)
	}

	toJSON() {
		return {
			id: this.id,
			name: this.name,
			createdAt: this.createdAt.toISOString(),
		}
	}
}
`
	await writeFileWithDir(`${ctx.modulePath}/Application/DTOs/${ctx.pascalCase}DTO.ts`, content)
}

async function generateRepository(ctx: any) {
	const content = `/**
 * @file ${ctx.pascalCase}Repository.ts
 * @description ${ctx.pascalCase} Repository 實現
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/Ports/Database/IDatabaseAccess'
import type { IEventDispatcher } from '@/Shared/Infrastructure/Ports/Messaging/IEventDispatcher'
import type { IEventStore } from '@/Shared/Infrastructure/Ports/Database/IEventStore'
import type { DomainEvent } from '@/Shared/Domain/DomainEvent'
import type { IntegrationEvent } from '@/Shared/Domain/IntegrationEvent'
import { BaseEventSourcedRepository } from '@/Shared/Infrastructure/Database/Repositories/BaseEventSourcedRepository'
import type { I${ctx.pascalCase}Repository } from '../../Domain/Repositories/I${ctx.pascalCase}Repository'
import { ${ctx.pascalCase} } from '../../Domain/Aggregates/${ctx.pascalCase}'

export class ${ctx.pascalCase}Repository extends BaseEventSourcedRepository<${ctx.pascalCase}> implements I${ctx.pascalCase}Repository {
	constructor(
		db: IDatabaseAccess,
		dispatcher?: IEventDispatcher,
		eventStore?: IEventStore
	) {
		super(db, dispatcher, eventStore)
	}

	protected getTableName(): string {
		return '${ctx.snakeCase}'
	}

	protected getAggregateTypeName(): string {
		return '${ctx.pascalCase}'
	}

	protected toDomain(row: any): ${ctx.pascalCase} {
		return ${ctx.pascalCase}.reconstitute(
			row.id as string,
			row.name as string,
			new Date(row.created_at as string)
		)
	}

	protected toRow(entity: ${ctx.pascalCase}): Record<string, unknown> {
		return {
			id: entity.id,
			name: entity.name,
			created_at: entity.createdAt.toISOString(),
			updated_at: new Date().toISOString(),
		}
	}

	protected toIntegrationEvent(event: DomainEvent): IntegrationEvent | null {
		// 在此實現領域事件到整合事件的轉換
		// 例如: if (event instanceof ${ctx.pascalCase}Created) { ... }
		return null
	}
}
`
	await writeFileWithDir(
		`${ctx.modulePath}/Infrastructure/Persistence/${ctx.pascalCase}Repository.ts`,
		content
	)
}

async function generateServiceProvider(ctx: any) {
	const content = `/**
 * @file ${ctx.pascalCase}ServiceProvider.ts
 * @description ${ctx.pascalCase} 模組服務提供者
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/Ports/Core/IServiceProvider'
import { resolveRepository } from '@wiring/RepositoryResolver'
import { Create${ctx.pascalCase}Service } from '../../Application/Services/Create${ctx.pascalCase}Service'
import { Get${ctx.pascalCase}Service } from '../../Application/Services/Get${ctx.pascalCase}Service'
import { ${ctx.pascalCase}MessageService } from '../Services/${ctx.pascalCase}MessageService'
import type { I${ctx.pascalCase}Repository } from '../../Domain/Repositories/I${ctx.pascalCase}Repository'
import type { ITranslator } from '@/Shared/Infrastructure/Ports/Services/ITranslator'

export class ${ctx.pascalCase}ServiceProvider extends ModuleServiceProvider {
	override register(container: IContainer): void {
		// Repository
		container.singleton('${ctx.camelCase}Repository', () => resolveRepository('${ctx.snakeCase}'))

		// Messages
		container.singleton('${ctx.camelCase}Messages', (c) => {
			return new ${ctx.pascalCase}MessageService(c.make('translator') as ITranslator)
		})

		// Application Services
		container.singleton('create${ctx.pascalCase}Service', (c) => {
			return new Create${ctx.pascalCase}Service(c.make('${ctx.camelCase}Repository') as I${ctx.pascalCase}Repository)
		})

		container.singleton('get${ctx.pascalCase}Service', (c) => {
			return new Get${ctx.pascalCase}Service(c.make('${ctx.camelCase}Repository') as I${ctx.pascalCase}Repository)
		})
	}

	override boot(_core: any): void {
		// Module initialization logic here
	}
}
`
	await writeFileWithDir(
		`${ctx.modulePath}/Infrastructure/Providers/${ctx.pascalCase}ServiceProvider.ts`,
		content
	)
}

async function generateRegisterRepositories(ctx: any) {
	const content = `/**
 * @file register${ctx.pascalCase}Repositories.ts
 * @description 註冊 ${ctx.pascalCase} Repository 工廠
 */

import { ${ctx.pascalCase}Repository } from '../Persistence/${ctx.pascalCase}Repository'
import { getRegistry } from '@wiring/RepositoryRegistry'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/Ports/Database/IDatabaseAccess'

export function register${ctx.pascalCase}Repositories(db: IDatabaseAccess): void {
	const registry = getRegistry()
	registry.register('${ctx.snakeCase}', () => new ${ctx.pascalCase}Repository(db))
}
`
	await writeFileWithDir(
		`${ctx.modulePath}/Infrastructure/Providers/register${ctx.pascalCase}Repositories.ts`,
		content
	)
}

async function generateMessageService(ctx: any) {
	const content = `/**
 * @file ${ctx.pascalCase}MessageService.ts
 * @description ${ctx.pascalCase} 訊息服務
 */

import type { I${ctx.pascalCase}Messages } from '@/Shared/Infrastructure/Ports/Messages/I${ctx.pascalCase}Messages'
import type { ITranslator } from '@/Shared/Infrastructure/Ports/Services/ITranslator'

export class ${ctx.pascalCase}MessageService implements I${ctx.pascalCase}Messages {
	constructor(private translator: ITranslator) {}

	// 在此實現訊息方法
	// 例如: operationSuccessful(): string { return this.translator.trans('${ctx.snakeCase}.operation.successful') }
}
`
	await writeFileWithDir(
		`${ctx.modulePath}/Infrastructure/Services/${ctx.pascalCase}MessageService.ts`,
		content
	)
}

async function generateController(ctx: any) {
	const content = `/**
 * @file ${ctx.pascalCase}Controller.ts
 * @description ${ctx.pascalCase} HTTP 控制器
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { I${ctx.pascalCase}Repository } from '../../Domain/Repositories/I${ctx.pascalCase}Repository'
import { Create${ctx.pascalCase}Service } from '../../Application/Services/Create${ctx.pascalCase}Service'
import { Get${ctx.pascalCase}Service } from '../../Application/Services/Get${ctx.pascalCase}Service'

export class ${ctx.pascalCase}Controller {
	constructor(private repository: I${ctx.pascalCase}Repository) {}

	async index(ctx: IHttpContext): Promise<Response> {
		try {
			const items = await this.repository.findAll()
			return ctx.json({ success: true, data: items })
		} catch (error) {
			return ctx.json({ success: false, message: 'Failed to fetch items' }, 500)
		}
	}

	async show(ctx: IHttpContext): Promise<Response> {
		try {
			const service = new Get${ctx.pascalCase}Service(this.repository)
			const item = await service.execute(ctx.params.id!)
			if (!item) {
				return ctx.json({ success: false, message: 'Not found' }, 404)
			}
			return ctx.json({ success: true, data: item })
		} catch (error) {
			return ctx.json({ success: false, message: 'Failed to fetch item' }, 500)
		}
	}

	async store(ctx: IHttpContext): Promise<Response> {
		try {
			// 從請求體取得資料（根據具體框架調整）
			// const { id, name } = await ctx.request.json()
			const service = new Create${ctx.pascalCase}Service(this.repository)
			// const result = await service.execute({ id, name })
			// return ctx.json({ success: true, data: result }, 201)
			return ctx.json({ success: false, message: 'Not implemented' }, 501)
		} catch (error) {
			return ctx.json({ success: false, message: (error as Error).message }, 400)
		}
	}
}
`
	await writeFileWithDir(
		`${ctx.modulePath}/Presentation/Controllers/${ctx.pascalCase}Controller.ts`,
		content
	)
}

async function generateRoutes(ctx: any) {
	const content = `/**
 * @file api.ts
 * @description ${ctx.pascalCase} 路由定義
 */

import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import { ${ctx.pascalCase}Controller } from '../Controllers/${ctx.pascalCase}Controller'

export function register${ctx.pascalCase}Routes(router: IModuleRouter, controller: ${ctx.pascalCase}Controller): void {
	router.get('/api/${ctx.snakeCase}', (ctx) => controller.index(ctx))
	router.get('/api/${ctx.snakeCase}/:id', (ctx) => controller.show(ctx))
	router.post('/api/${ctx.snakeCase}', (ctx) => controller.store(ctx))
}
`
	await writeFileWithDir(`${ctx.modulePath}/Presentation/Routes/api.ts`, content)
}

async function generateWiring(ctx: any) {
	const content = `/**
 * @file wire${ctx.pascalCase}Routes.ts
 * @description ${ctx.pascalCase} 路由裝配
 */

import { register${ctx.pascalCase}Routes } from '../../Presentation/Routes/api'
import { ${ctx.pascalCase}Controller } from '../../Presentation/Controllers/${ctx.pascalCase}Controller'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Adapters/Gravito/GravitoModuleRouter'
import type { I${ctx.pascalCase}Repository } from '../../Domain/Repositories/I${ctx.pascalCase}Repository'

export function wire${ctx.pascalCase}Routes(core: any): void {
	const repository = core.container.make('${ctx.camelCase}Repository') as I${ctx.pascalCase}Repository
	const controller = new ${ctx.pascalCase}Controller(repository)
	const router = createGravitoModuleRouter(core)
	register${ctx.pascalCase}Routes(router, controller)
}
`
	await writeFileWithDir(
		`${ctx.modulePath}/Infrastructure/Wiring/wire${ctx.pascalCase}Routes.ts`,
		content
	)
}

async function generateModuleIndex(ctx: any) {
	const content = `/**
 * @file index.ts
 * @description ${ctx.pascalCase} 模組導出與裝配定義
 */

import type { IModuleDefinition } from '@/Shared/Infrastructure/Wiring/ModuleDefinition'
import { ${ctx.pascalCase}ServiceProvider } from './Infrastructure/Providers/${ctx.pascalCase}ServiceProvider'
import { register${ctx.pascalCase}Repositories } from './Infrastructure/Providers/register${ctx.pascalCase}Repositories'
import { wire${ctx.pascalCase}Routes } from './Infrastructure/Wiring/wire${ctx.pascalCase}Routes'

// Domain - Aggregates
export { ${ctx.pascalCase} } from './Domain/Aggregates/${ctx.pascalCase}'

// Domain - ValueObjects
export { ${ctx.pascalCase}Id } from './Domain/ValueObjects/${ctx.pascalCase}Id'

// Domain - Events
export { ${ctx.pascalCase}Created } from './Domain/Events/${ctx.pascalCase}Created'

// Domain - Repositories
export type { I${ctx.pascalCase}Repository } from './Domain/Repositories/I${ctx.pascalCase}Repository'

// Application - Services
export { Create${ctx.pascalCase}Service } from './Application/Services/Create${ctx.pascalCase}Service'
export { Get${ctx.pascalCase}Service } from './Application/Services/Get${ctx.pascalCase}Service'

// Application - DTOs
export { ${ctx.pascalCase}DTO } from './Application/DTOs/${ctx.pascalCase}DTO'

// Infrastructure
export { ${ctx.pascalCase}Repository } from './Infrastructure/Persistence/${ctx.pascalCase}Repository'
export { ${ctx.pascalCase}ServiceProvider } from './Infrastructure/Providers/${ctx.pascalCase}ServiceProvider'

// Presentation
export { ${ctx.pascalCase}Controller } from './Presentation/Controllers/${ctx.pascalCase}Controller'
export { register${ctx.pascalCase}Routes } from './Presentation/Routes/api'

/**
 * 模組定義物件 - 供自動裝配機制使用
 */
export const ${ctx.pascalCase}Module: IModuleDefinition = {
	name: '${ctx.pascalCase}',
	provider: ${ctx.pascalCase}ServiceProvider,
	registerRepositories: register${ctx.pascalCase}Repositories,
	registerRoutes: wire${ctx.pascalCase}Routes,
}
`

	await writeFileWithDir(`${ctx.modulePath}/index.ts`, content)
}

async function generateMessagePort(ctx: any) {
	const content = `/**
 * @file I${ctx.pascalCase}Messages.ts
 * @description ${ctx.pascalCase} 訊息 Port 介面
 */

export interface I${ctx.pascalCase}Messages {
	// 在此定義訊息方法
	// 例如: operationSuccessful(): string
}
`
	await writeFileWithDir(
		`app/Shared/Infrastructure/Ports/Messages/I${ctx.pascalCase}Messages.ts`,
		content
	)
}

async function generateLocales(ctx: any) {
	const enContent = JSON.stringify({
		// 在此添加英文訊息鍵值
	}, null, 2)

	const zhTwContent = JSON.stringify({
		// 在此添加繁體中文訊息鍵值
	}, null, 2)

	await writeFileWithDir(`locales/en/${ctx.snakeCase}.json`, enContent)
	await writeFileWithDir(`locales/zh-TW/${ctx.snakeCase}.json`, zhTwContent)
}

async function generateREADME(ctx: any) {
	const content = `# ${ctx.pascalCase} 模組

${ctx.pascalCase} 模組提供 ...（在此描述模組的功能）

## 結構

\`\`\`
Domain/           # 領域層（業務邏輯）
  Aggregates/    # 聚合根
  ValueObjects/  # 值物件
  Repositories/  # Repository 介面
  Events/        # 領域事件

Application/      # 應用層（使用案例）
  Services/      # 應用服務
  DTOs/          # 資料傳輸物件

Infrastructure/   # 基礎設施層（具體實現）
  Persistence/   # Repository 實現
  Providers/     # Service Provider
  Services/      # 基礎設施服務
  Wiring/        # 模組裝配

Presentation/     # 表現層（HTTP）
  Controllers/   # HTTP 控制器
  Routes/        # 路由定義
\`\`\`

## 開發流程

1. **定義領域模型**: 編輯 \`Domain/Aggregates/${ctx.pascalCase}.ts\`
2. **實現應用服務**: 編輯 \`Application/Services/*.ts\`
3. **配置依賴**: 編輯 \`Infrastructure/Providers/${ctx.pascalCase}ServiceProvider.ts\`
4. **實現 HTTP 層**: 編輯 \`Presentation/Controllers/${ctx.pascalCase}Controller.ts\`

## 測試

\`\`\`bash
# 運行所有測試
bun test

# 運行此模組的測試
bun test tests/Unit/Modules/${ctx.pascalCase}
\`\`\`

## API 端點

- \`GET /api/${ctx.snakeCase}\` - 列出所有 ${ctx.pascalCase}
- \`GET /api/${ctx.snakeCase}/:id\` - 取得單個 ${ctx.pascalCase}
- \`POST /api/${ctx.snakeCase}\` - 建立新 ${ctx.pascalCase}

## 相關命令

\`\`\`bash
# 添加領域事件
bun make event ${ctx.pascalCase} ${ctx.pascalCase}Updated

# 添加值物件
bun make vo ${ctx.pascalCase} ${ctx.pascalCase}Slug

# 添加應用服務
bun make service ${ctx.pascalCase} Update${ctx.pascalCase}Service

# 添加 DTO
bun make dto ${ctx.pascalCase} ${ctx.pascalCase}ListDTO
\`\`\`
`
	await writeFileWithDir(`${ctx.modulePath}/README.md`, content)
}
