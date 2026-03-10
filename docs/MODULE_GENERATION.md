# 模組生成指南

gravito-ddd-starter 提供自定義的模組生成器，確保所有生成的模組都遵循 **框架無關的架構模式**。

## 快速開始

### 生成新模組

```bash
bun run generate:module <ModuleName>
```

**示例**：
```bash
bun run generate:module Product
bun run generate:module Order
bun run generate:module Category
```

這將生成以下結構：

```
src/Modules/<ModuleName>/
├── Domain/
│   ├── Entities/
│   ├── ValueObjects/
│   ├── Repositories/
│   │   └── I<ModuleName>Repository.ts    ← 倒依賴介面
│   └── Services/
├── Application/
│   ├── Services/
│   └── DTOs/
├── Presentation/
│   ├── Controllers/
│   │   └── <ModuleName>Controller.ts     ← 接收 IHttpContext
│   └── Routes/
│       └── <moduleName>.routes.ts        ← 接收 IModuleRouter
├── Infrastructure/
│   ├── Repositories/
│   │   └── <ModuleName>Repository.ts
│   └── Providers/
│       └── <ModuleName>ServiceProvider.ts ← 只註冊領域依賴
├── tests/
├── index.ts
└── README.md
```

## 整合新模組

### Step 1: 註冊 ServiceProvider

在 `src/bootstrap.ts` 的 Step 3（Register module service providers）中添加，並依依賴順序排列：

```typescript
import { createGravitoServiceProvider } from './adapters/GravitoServiceProviderAdapter'
import { ProductServiceProvider } from './Modules/Product/Infrastructure/Providers/ProductServiceProvider'

// ...

core.register(createGravitoServiceProvider(new ProductServiceProvider()))
```

### Step 2: 在接線層添加註冊函式

編輯 `src/wiring/index.ts`：

```typescript
import { createGravitoModuleRouter } from '@/adapters/GravitoModuleRouter'
import { registerProductRoutes } from '@/Modules/Product/Presentation/Routes/product.routes'
import { ProductController } from '@/Modules/Product/Presentation/Controllers/ProductController'

/**
 * 註冊 Product 模組
 */
export const registerProduct = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)

	// 從容器中獲取服務
	const repository = core.container.make('productRepository') as any

	// 實例化控制器（依賴已注入）
	const controller = new ProductController(repository)

	// 使用框架無關的路由註冊
	registerProductRoutes(router, controller)
}
```

### Step 3: 在根路由中呼叫

編輯 `src/routes.ts`：

```typescript
import { registerProduct } from './wiring'

export async function registerRoutes(core: PlanetCore) {
	// ... 其他路由

	// 所有模組透過接線層統一註冊
	registerProduct(core)

	console.log('✅ Routes registered')
}
```

## 架構特點

### ✅ 框架無關設計

生成的模組遵循以下原則：

1. **Routes 層** - 完全框架無關
   ```typescript
   // ✅ 正確：接收 IModuleRouter + controller
   export function registerProductRoutes(
   	router: IModuleRouter,
   	controller: ProductController,
   ): void {
   	router.get('/api/products', (ctx) => controller.index(ctx))
   }
   ```

2. **Controllers 層** - 只依賴業務邏輯
   ```typescript
   // ✅ 正確：接收 IHttpContext（不是 GravitoContext）
   async index(ctx: IHttpContext): Promise<Response> {
   	const items = await this.repository.findAll()
   	return ctx.json({ success: true, data: items })
   }
   ```

3. **ServiceProvider 層** - 只負責領域服務
   ```typescript
   // ✅ 正確：只註冊領域依賴（Repository、Handler）
   register(container: Container): void {
   	container.singleton('productRepository', () => {
   		return new ProductRepository()
   	})
   }
   ```

### 🔄 未來框架遷移

遵循此模式，更換框架只需修改：
- `src/adapters/` - Gravito 適配層
- `src/wiring/` - 框架特定的資源獲取方式
- Routes 和 Controllers **無需修改**

## 常見場景

### 添加應用服務（Handler）

生成後在 `Domain/` 和 `Application/` 中添加：

```typescript
// Application/Commands/CreateProduct/CreateProductHandler.ts
export class CreateProductHandler {
	constructor(private repository: IProductRepository) {}

	async handle(data: CreateProductDTO): Promise<ProductDTO> {
		// 業務邏輯
		return DTO
	}
}
```

在 ServiceProvider 中註冊：

```typescript
container.factory('createProductHandler', (c: Container) => {
	const repository = c.make('productRepository')
	return new CreateProductHandler(repository)
})
```

在 Controller 中注入：

```typescript
export class ProductController {
	constructor(
		private repository: IProductRepository,
		private createProductHandler: CreateProductHandler,
	) {}

	async store(ctx: IHttpContext): Promise<Response> {
		const body = await ctx.getJsonBody<CreateProductDTO>()
		const product = await this.createProductHandler.handle(body)
		return ctx.json({ success: true, data: product }, 201)
	}
}
```

在 Wiring 層更新：

```typescript
export const registerProduct = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)

	const repository = core.container.make('productRepository') as any
	const createProductHandler = core.container.make('createProductHandler') as any

	// 注入兩個依賴
	const controller = new ProductController(repository, createProductHandler)

	registerProductRoutes(router, controller)
}
```

### 添加 Domain Events

在 `Domain/Events/` 中定義事件，在 Aggregate Root 中發佈，在 Infrastructure 中訂閱：

```typescript
// Domain/Events/ProductCreatedEvent.ts
export class ProductCreatedEvent {
	constructor(public productId: string, public name: string) {}
}

// Domain/Aggregates/Product.ts
export class Product {
	events: DomainEvent[] = []

	static create(id: string, name: string): Product {
		const product = new Product(id, name)
		product.events.push(new ProductCreatedEvent(id, name))
		return product
	}
}

// Infrastructure/EventSubscribers/ProductCreatedSubscriber.ts
export class ProductCreatedSubscriber implements EventSubscriber {
	async handle(event: ProductCreatedEvent): Promise<void> {
		// 處理事件（發送通知、更新查詢模型等）
	}
}
```

### 使用 Value Objects

在 `Domain/ValueObjects/` 中定義：

```typescript
// Domain/ValueObjects/ProductCode.ts
export class ProductCode extends ValueObject {
	constructor(readonly value: string) {
		super()
		if (!value.match(/^[A-Z]{3}-\d{4}$/)) {
			throw new Error('Invalid product code format')
		}
	}

	equals(other: any): boolean {
		return other instanceof ProductCode && other.value === this.value
	}
}
```

## 最佳實踐

### DO ✅

1. **在 ServiceProvider 中配置所有依賴**
   - Repository（單例）
   - Application Services / Handlers（工廠）
   - 絕不在 Routes 中創建控制器

2. **通過構造函數注入依賴**
   - Controllers 接收 Repository + Handlers
   - Services 接收 Repository + 其他 Services

3. **使用 IHttpContext，不使用 GravitoContext**
   - 控制器方法接收 `IHttpContext`
   - 使用 `ctx.json()`、`ctx.params`、`ctx.query` 等

4. **Wiring 層負責組裝**
   - 從容器獲取服務
   - 實例化控制器
   - 調用框架無關的路由函式

### DON'T ❌

1. ❌ 在 Routes 中直接創建 Controller
   ```typescript
   // ❌ 錯誤
   const controller = new ProductController()
   ```

2. ❌ 在 Controller 中訪問容器
   ```typescript
   // ❌ 錯誤
   const repository = ctx.get('core').container.make('productRepository')
   ```

3. ❌ 控制器使用 GravitoContext
   ```typescript
   // ❌ 錯誤
   async index(ctx: GravitoContext) {
   	const core = ctx.get('core') as PlanetCore
   }
   ```

4. ❌ 在 ServiceProvider 中註冊 Controller
   ```typescript
   // ❌ 錯誤
   container.factory('productController', () => new ProductController())
   ```

## 測試

生成的模組支持三層測試：

```bash
# Unit tests - Domain 層邏輯（無外部依賴）
bun test tests/Unit/Product/

# Integration tests - Repository + Service 交互
bun test tests/Integration/Product/

# Feature tests - API 端點
bun test tests/Feature/Product/
```

示例：

```typescript
// tests/Unit/Product/ProductCode.test.ts
import { describe, it, expect } from 'bun:test'
import { ProductCode } from '../../../src/Modules/Product/Domain/ValueObjects/ProductCode'

describe('ProductCode', () => {
	it('should create valid product code', () => {
		const code = new ProductCode('ABC-1234')
		expect(code.value).toBe('ABC-1234')
	})

	it('should reject invalid format', () => {
		expect(() => new ProductCode('invalid')).toThrow()
	})
})
```

## 故障排除

### Q: 控制器無法訪問框架資源（db、redis、cache）？

A: 這些資源應該在業務邏輯層註冊為服務，然後通過 DI 注入到 Controller。

```typescript
// ✅ 正確方式
export class ProductService {
	constructor(
		private repository: IProductRepository,
		private db: any,  // 通過 DI 注入
	) {}
}
```

### Q: 如何添加中間件（認證、授權）？

A: 在 Wiring 層中使用 IModuleRouter 的中間件支持：

```typescript
export const registerProduct = (core: PlanetCore): void => {
	const router = createGravitoModuleRouter(core)
	const controller = new ProductController(...)

	// 帶中間件的路由
	const authGuard = async (ctx, next) => {
		const token = ctx.getHeader('Authorization')
		if (!token) return ctx.json({ error: 'Unauthorized' }, 401)
		return next()
	}

	router.get('/api/products/:id', [authGuard], (ctx) => controller.show(ctx))
}
```

## 相關文件

- [架構指南](./ARCHITECTURE.md)
- [API 設計標準](./API_GUIDELINES.md)
- [測試策略](./TESTING.md)
