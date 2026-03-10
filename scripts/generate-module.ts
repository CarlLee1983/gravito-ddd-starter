#!/usr/bin/env bun
/**
 * 自定義模組生成器
 *
 * 確保生成的模組遵循框架無關的架構模式：
 * - Routes 接收 IModuleRouter + controller（無容器耦合）
 * - Controllers 接收 IHttpContext（無 GravitoContext 耦合）
 * - ServiceProvider 只負責領域服務依賴（繼承 ModuleServiceProvider）
 * - Wiring 層負責適配器 + DI 組裝
 * - 可選基礎設施服務（Redis、Cache、Database）可自動生成適配器
 *
 * 用法: bun scripts/generate-module.ts <ModuleName> [--redis] [--cache] [--db] [--migration]
 * 示例:
 *   bun scripts/generate-module.ts Product
 *   bun scripts/generate-module.ts Order --db           # 含 DB-backed Repository + migration
 *   bun scripts/generate-module.ts Post --migration     # 僅含 migration/seeder
 *   bun scripts/generate-module.ts Session --redis
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
	console.error('示例: bun scripts/generate-module.ts Order --db --migration')
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

		// 若 --db，覆寫 Repository 為 IDatabaseAccess 版本
		if (flags.db) {
			const dbRepository = `/**
 * ${pascalCase}Repository
 * ${pascalCase} 倉庫實現（Database-backed）
 *
 * 使用 IDatabaseAccess 與資料庫互動，支援完整的 CRUD 操作
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { I${pascalCase}Repository } from '../../Domain/Repositories/I${pascalCase}Repository'

export class ${pascalCase}Repository implements I${pascalCase}Repository {
	constructor(private db: IDatabaseAccess) {}

	async findAll(): Promise<any[]> {
		return this.db.table('${moduleName.toLowerCase()}s').select()
	}

	async findById(id: string): Promise<any | null> {
		return this.db.table('${moduleName.toLowerCase()}s').where('id', id).first()
	}

	async save(entity: any): Promise<void> {
		const exists = await this.findById(entity.id)
		if (exists) {
			await this.db.table('${moduleName.toLowerCase()}s').where('id', entity.id).update(entity)
		} else {
			await this.db.table('${moduleName.toLowerCase()}s').insert(entity)
		}
	}

	async delete(id: string): Promise<void> {
		await this.db.table('${moduleName.toLowerCase()}s').where('id', id).delete()
	}
}
`
			await writeFile(join(modulePath, `Infrastructure/Repositories/${pascalCase}Repository.ts`), dbRepository)
			console.log(`  ✓ Infrastructure/Repositories/${pascalCase}Repository.ts (DB-backed)`)
		}

		// 生成 ServiceProvider（框架無關）
		const serviceProvider = `/**
 * ${pascalCase}ServiceProvider
 * 配置 ${pascalCase} 模組的領域服務依賴
 *
 * 設計原則：
 * - 繼承框架無關的 ModuleServiceProvider
 * - 不依賴 @gravito/core（框架解耦）
 * - 只負責註冊領域和應用層依賴
 * - Presentation 層的依賴由 Wiring 層組裝
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { ${pascalCase}Repository } from '../Repositories/${pascalCase}Repository'

export class ${pascalCase}ServiceProvider extends ModuleServiceProvider {
	/**
	 * 註冊所有領域依賴
	 */
	override register(container: IContainer): void {
		// 註冊 Repository (單例)
		container.singleton('${moduleName}Repository', () => {
			return new ${pascalCase}Repository()
		})
	}

	/**
	 * 啟動時執行初始化邏輯
	 */
	override boot(_context: any): void {
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

1. 在 \`src/app.ts\` 中使用適配器註冊 ServiceProvider：
   \`\`\`typescript
   core.register(createGravitoServiceProvider(new ${pascalCase}ServiceProvider()))
   \`\`\`

2. 在 \`src/wiring/index.ts\` 中添加 \`register${pascalCase}\` 函式

3. 在 \`src/routes.ts\` 中調用 \`register${pascalCase}(core)\`

## 框架無關設計

- Routes 接收 \`IModuleRouter\` + \`controller\`
- Controllers 接收 \`IHttpContext\`（不依賴 \`GravitoContext\`）
- ServiceProvider 繼承 \`ModuleServiceProvider\`（不依賴 \`@gravito/core\`）
- 未來換框架只需修改 \`adapters/\`
`
		await writeFile(join(modulePath, 'README.md'), readme)
		console.log(`  ✓ README.md`)

		// 生成 Migration 和 Seeder
		if (flags.migration || flags.db) {
			await mkdir('database/migrations', { recursive: true })
			await mkdir('database/seeders', { recursive: true })

			// 計算序號
			const existing = await readdir('database/migrations').catch(() => [])
			const seq = String(existing.filter((f) => f.endsWith('.ts')).length + 1).padStart(3, '0')
			const tableName = `${moduleName.toLowerCase()}s`
			const migrationFile = `${seq}_create_${tableName}_table`

			// migration 內容
			const migration = `import type { AtlasOrbit } from '@gravito/atlas'
import { createTable, dropTableIfExists } from '../MigrationHelper'

export async function up(db: AtlasOrbit): Promise<void> {
	await createTable(db, '${tableName}', (t) => {
		t.id()
		t.string('name').notNull()
		t.timestamps()
	})
}

export async function down(db: AtlasOrbit): Promise<void> {
	await dropTableIfExists(db, '${tableName}')
}
`
			await writeFile(`database/migrations/${migrationFile}.ts`, migration)
			console.log(`  ✓ database/migrations/${migrationFile}.ts`)

			// seeder 內容
			const seeder = `import { DB } from '@gravito/atlas'

export default async function seed(): Promise<void> {
	await DB.table('${tableName}').insert({
		id: '00000000-0000-0000-0000-000000000001',
		name: 'Sample ${pascalCase}',
		created_at: new Date().toISOString(),
	})
	console.log('${pascalCase}Seeder: Seeding complete')
}
`
			await writeFile(`database/seeders/${pascalCase}Seeder.ts`, seeder)
			console.log(`  ✓ database/seeders/${pascalCase}Seeder.ts`)
		}

		// 若需要基礎設施服務，生成 Gravito 適配器
		if (flags.redis || flags.cache || flags.db) {
			const adapters: string[] = []
			const imports: string[] = []

			if (flags.redis) {
				adapters.push('redis?: IRedisService | null')
				imports.push("import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'")
			}
			if (flags.cache) {
				adapters.push('cache?: ICacheService | null')
				imports.push("import type { ICacheService } from '@/Shared/Infrastructure/ICacheService'")
			}
			if (flags.db) {
				adapters.push('db?: IDatabaseConnectivityCheck | null')
				imports.push("import type { IDatabaseConnectivityCheck } from '@/Shared/Infrastructure/IDatabaseConnectivityCheck'")
			}

			const adapterContent = `/**
 * Gravito${pascalCase}Adapter - ${pascalCase} 模組完整適配器
 *
 * 責任：
 * 1. 從 PlanetCore 取得框架服務（Redis/Cache 可能為 undefined）
 * 2. 適配為框架無關的介面
 * 3. 組裝 ${pascalCase}Service + ${pascalCase}Controller
 * 4. 透過 IModuleRouter 註冊路由
 *
 * 這是唯一知道 Gravito 框架細節的地方。
 * 所有業務邏輯層完全無框架耦合。
 */

import type { PlanetCore } from '@gravito/core'
${flags.redis ? "import type { RedisClientContract } from '@gravito/plasma'" : ''}
${flags.cache ? "import type { CacheManager } from '@gravito/stasis'" : ''}
${imports.join('\n')}
import { createGravitoModuleRouter } from './GravitoModuleRouter'
${flags.redis ? "import { GravitoRedisAdapter } from './GravitoRedisAdapter'" : ''}
${flags.cache ? "import { GravitoCacheAdapter } from './GravitoCacheAdapter'" : ''}
${flags.db ? "import { createGravitoDatabaseConnectivityCheck } from './GravitoDatabaseAdapter'" : ''}
import { ${pascalCase}Repository } from '@/Modules/${pascalCase}/Infrastructure/Repositories/${pascalCase}Repository'
import { ${pascalCase}Controller } from '@/Modules/${pascalCase}/Presentation/Controllers/${pascalCase}Controller'
import { register${pascalCase}Routes } from '@/Modules/${pascalCase}/Presentation/Routes/${moduleName}.routes'

/**
 * 註冊 ${pascalCase} 模組與 Gravito 框架
 */
export function register${pascalCase}WithGravito(core: PlanetCore): void {
	// 從 PlanetCore 容器提取原始服務
${flags.redis ? "\tconst rawRedis = core.container.make<RedisClientContract | undefined>('redis')" : ''}
${flags.cache ? "\tconst rawCache = core.container.make<CacheManager | undefined>('cache')" : ''}

	// 適配為框架無關的介面（null 表示未設定）
${flags.redis ? "\tconst redis = rawRedis ? new GravitoRedisAdapter(rawRedis) : null" : ''}
${flags.cache ? "\tconst cache = rawCache ? new GravitoCacheAdapter(rawCache) : null" : ''}
${flags.db ? "\tconst databaseCheck = createGravitoDatabaseConnectivityCheck()" : ''}

	// 組裝應用層
	const repository = new ${pascalCase}Repository()
	const controller = new ${pascalCase}Controller(repository)

	// 建立框架無關的路由介面
	const router = createGravitoModuleRouter(core)

	// 透過 IModuleRouter 註冊路由
	register${pascalCase}Routes(router, controller)
}
`
			await writeFile(
				join('src/adapters', `Gravito${pascalCase}Adapter.ts`),
				adapterContent,
			)
			console.log(`  ✓ src/adapters/Gravito${pascalCase}Adapter.ts`)
		}

		console.log(`\n✅ 模組 ${pascalCase} 生成成功！`)
		console.log(`\n📝 後續步驟：`)
		console.log(`1. 在 src/app.ts 中使用適配器註冊 ${pascalCase}ServiceProvider`)
		console.log(`2. 在 src/wiring/index.ts 中添加 register${pascalCase}() 函式`)
		if (flags.migration || flags.db) {
			console.log(`   💡 已生成 migration 和 seeder：`)
			console.log(`      bun run migrate       → 執行遷移`)
			console.log(`      bun run seed          → 執行 Seeder`)
			console.log(`      bun run db:fresh      → 重置並植入資料`)
		}
		if (flags.redis || flags.cache || flags.db) {
			console.log(`   💡 提示：已自動生成 src/adapters/Gravito${pascalCase}Adapter.ts`)
			console.log(`   在 wiring 層中調用 register${pascalCase}WithGravito(core)`)
		}
		console.log(`3. 在 src/routes.ts 中調用 register${pascalCase}(core)`)
		console.log(`4. 根據需要修改 Domain/、Application/ 層的實現`)
	} catch (error) {
		console.error('❌ 生成失敗:', error)
		process.exit(1)
	}
}

generateModule()
