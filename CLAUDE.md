# gravito-ddd 項目開發指南

本文件補充全局 Claude 配置，提供 gravito-ddd 項目的特定開發指引。

## 項目概述

**gravito-ddd** 是 Gravito 框架的完整 DDD 實踐示例，展示如何構建可擴展、ORM 無關的 Node.js 應用。

### 核心特性

- ✅ **DDD + DCI 架構**: 清晰的分層設計
- ✅ **可隨時替換 ORM**: Domain 層完全無關 ORM 選擇
- ✅ **自動模組生成**: 快速創建符合架構規範的模組
- ✅ **Bun 優化**: 針對 Bun 運行時的性能優化
- ✅ **事件驅動**: 支持領域事件與非同步處理

## 快速開始

### 環境要求

- **Bun**: v1.3.10+
- **Node.js**: v22.17.1+（用於某些工具）

### 初始設置

```bash
# 1. 安裝依賴（Bun 會自動鏈接本地 @gravito/core）
bun install

# 2. 如果本地修改 @gravito/core，重新鏈接
bun link @gravito/core

# 3. 啟動開發伺服器
bun dev

# 4. 運行測試
bun test
```

## 模組開發工作流

### 創建新模組

#### 1. 簡單模組（推薦首選）

```bash
bun scripts/generate-module.ts Product
```

這會生成基本的 DDD 結構，無任何框架依賴。

#### 2. 帶基礎設施服務的模組

```bash
# 帶 Redis 快取
bun scripts/generate-module.ts Session --redis

# 帶應用層快取
bun scripts/generate-module.ts Cart --cache

# 帶數據庫連線檢查
bun scripts/generate-module.ts Audit --db

# 組合所有服務
bun scripts/generate-module.ts Order --redis --cache --db
```

### 模組結構詳解

每個模組遵循嚴格的分層：

```
src/Modules/Product/
├── Domain/
│   ├── Entities/Product.ts              # 不知道 ORM 存在
│   ├── ValueObjects/ProductId.ts
│   ├── Repositories/
│   │   └── IProductRepository.ts        # 只定義契約
│   └── Services/ProductService.ts       # 使用 Repository 介面
│
├── Application/
│   ├── Services/ProductApplicationService.ts  # 使用 IDatabaseAccess
│   └── DTOs/
│       ├── CreateProductDTO.ts
│       └── ProductResponseDTO.ts
│
├── Presentation/
│   ├── Controllers/ProductController.ts       # HTTP 層
│   └── Routes/Product.routes.ts              # 路由定義
│
├── Infrastructure/
│   ├── Repositories/
│   │   └── ProductRepository.ts   # 實現 IProductRepository（ORM 無關）
│   └── Providers/
│       └── ProductServiceProvider.ts  # DI 容器配置（綁定 Repository 實現）
│
├── index.ts                        # 模組導出點
└── README.md                       # 模組文檔
```

### 核心規則（必須遵守）

#### ❌ Domain 層禁止

```typescript
// ❌ 錯誤：Domain 層不應知道 ORM
import { User as AtlasUser } from '@gravito/atlas'
import type { Repository } from 'typeorm'

export class User extends AtlasUser {
  // ...
}
```

#### ✅ Domain 層應該

```typescript
// ✅ 正確：只定義邏輯，介面抽象
export class User {
  private readonly id: string
  private readonly email: string

  constructor(id: string, email: string) {
    if (!email.includes('@')) throw new Error('Invalid email')
    this.id = id
    this.email = email
  }
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>
  save(user: User): Promise<void>
}
```

#### ❌ Application 層禁止

```typescript
// ❌ 錯誤：不應使用 ORM 特定型別
import type { SelectQueryBuilder } from 'typeorm'

export class UserService {
  async findWithQuery(queryBuilder: SelectQueryBuilder<User>) {
    // ...
  }
}
```

#### ✅ Application 層應該

```typescript
// ✅ 正確：使用 IDatabaseAccess（ORM 無關）
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export class UserService {
  constructor(private db: IDatabaseAccess) {}

  async findUser(id: string) {
    const repo = this.db.getRepository(User)
    return repo.findById(id)
  }
}
```

## 自動模組註冊機制

gravito-ddd 使用 `ModuleAutoWirer` 自動掃描和註冊模組，流程如下：

```
1. 掃描 src/Modules/*/index.ts
   ↓
2. 尋找 IModuleDefinition 導出
   ↓
3. 註冊 Service Provider（DI 容器）
   ↓
4. 呼叫 registerRepositories() - 註冊 Repository 工廠
   ↓
5. 呼叫 registerRoutes() - 註冊 HTTP 路由
```

### 模組導出格式

每個 `index.ts` 必須導出 `IModuleDefinition`：

```typescript
// src/Modules/Product/index.ts
import { ProductServiceProvider } from './Infrastructure/Providers/ProductServiceProvider'
import { ProductController } from './Presentation/Controllers/ProductController'

export const ProductModule: IModuleDefinition = {
  name: 'Product',
  provider: ProductServiceProvider,

  registerRepositories(db: IDatabaseAccess, eventDispatcher?: any) {
    // 註冊 Repository 工廠
    RepositoryRegistry.register('productRepository', () =>
      new ProductRepository(db, eventDispatcher)
    )
  },

  registerRoutes(core: PlanetCore) {
    // 註冊路由
    const controller = core.container.make(ProductController)
    core.registerController(ProductController)
  }
}
```

## 特定領域的開發指南

### 事件驅動模式

模組可以發佈和訂閱領域事件：

```typescript
// Domain Event
export class ProductCreatedEvent extends DomainEvent {
  constructor(
    public productId: string,
    public productName: string
  ) {
    super()
  }
}

// Entity 發佈事件
export class Product {
  private uncommittedEvents: DomainEvent[] = []

  static create(id: string, name: string): Product {
    const product = new Product(id, name)
    product.uncommittedEvents.push(
      new ProductCreatedEvent(id, name)
    )
    return product
  }

  getUncommittedEvents(): DomainEvent[] {
    return this.uncommittedEvents
  }
}

// Repository 負責分派事件
export class ProductRepository implements IProductRepository {
  async save(product: Product): Promise<void> {
    await this.db.save(product)
    await this.eventDispatcher.dispatch(product.getUncommittedEvents())
  }
}

// 其他模組訂閱事件
export class NotificationHandler {
  async handle(event: ProductCreatedEvent) {
    // 發送通知
  }
}
```

### Redis 快取集成

使用 `--redis` 標誌生成帶快取的模組：

```typescript
// src/adapters/GravitoSessionAdapter.ts
import type { RedisClientContract } from '@gravito/plasma'

export class GravitoSessionAdapter {
  constructor(private redis: RedisClientContract) {}

  async getSession(id: string) {
    const cached = await this.redis.get(`session:${id}`)
    if (cached) return JSON.parse(cached)

    const session = await this.repository.findById(id)
    await this.redis.set(`session:${id}`, JSON.stringify(session), 'EX', 3600)
    return session
  }
}
```

### Repository ORM 無關設計

Repository 實現是 ORM 可替換的關鍵。Module 本身不依賴任何固定的套件：

```typescript
// src/Modules/Product/Infrastructure/Repositories/ProductRepository.ts
// 此文件的具體實現（使用 Atlas/Drizzle/Prisma/TypeORM）由外部綁定決定

export class ProductRepository implements IProductRepository {
  constructor(private db: IDatabaseAccess) {
    // db 是通用的數據庫訪問介面，不知道背後是什麼 ORM
  }

  async findById(id: string): Promise<Product | null> {
    // 使用 this.db 通用方法，不使用 ORM 特定 API
    const repo = this.db.getRepository(Product)
    return repo.findById(id)
  }

  async save(product: Product): Promise<void> {
    const repo = this.db.getRepository(Product)
    await repo.save(product)
    // EventDispatcher 由外部注入，與 ORM 無關
    await this.eventDispatcher.dispatch(product.getUncommittedEvents())
  }
}

// Service Provider 中綁定實現 - 這是唯一依賴 ORM 的地方
// src/Modules/Product/Infrastructure/Providers/ProductServiceProvider.ts

export class ProductServiceProvider {
  register(container: IContainer) {
    // 綁定 Repository 實現 - ORM 變更時，只需改這裡
    container.bind('productRepository', () =>
      new ProductRepository(container.resolve(IDatabaseAccess))
    )
  }
}
```

**遷移流程**（從 Atlas → Drizzle）：
1. 修改 `ProductRepository` 實現（使用 Drizzle API 而非 Atlas）
2. 檢查 `IDatabaseAccess` 適配層是否支持新 ORM
3. 如需新適配器，在 `src/adapters/` 添加 `DrizzelDatabaseAdapter`
4. 更新 Service Provider 的綁定
5. Module 自身無需改動 ✅

### 分層測試

- **Unit Tests**: 測試 Domain 層實體和值物件
- **Integration Tests**: 測試 Repository 與數據庫交互
- **Feature/E2E Tests**: 測試完整的 HTTP 流程

```bash
bun test tests/Unit/          # Domain 層測試
bun test tests/Integration/   # Infrastructure 層測試
bun test tests/Feature/       # 端到端測試
```

## gravito-core 框架修正

如遇到 @gravito/core 的運行時異常，應直接在源代碼修正，而非規避：

### 修正流程

1. **識別問題**：確定是否來自 @gravito/core
2. **定位源代碼**：找到 `/Users/carl/Dev/Carl/gravito-core/packages/core/` 中的相關文件
3. **修正實現**：直接修改源代碼，添加備用方案（如 Bun API 不可用時）
4. **重建**：`cd gravito-core/packages/core && bun run build`
5. **驗證**：在 gravito-ddd 中運行 `bun dev` 測試

### 已知框架特性

- **Bun API 備用方案**: `bunEscapeHTML`, `bunPeek`, `bunFile` 都有 fallback 實現
- **ESM Only**: CJS 構建已移除，避免 Bun 動態 require() 問題
- **版本控制**: @gravito/core v2.0.1+ 經過 Bun 最佳化

## 參考文檔

### 項目文檔

- [架構設計](./docs/02-Architecture/ARCHITECTURE.md)
- [模組生成完整指南](./docs/04-Module-Development/MODULE_GENERATION_WITH_ADAPTERS.md)
- [抽象化規則](./docs/02-Architecture/ABSTRACTION_RULES.md)
- [適配器整合](./docs/06-Adapters-Wiring/ADAPTERS_AND_EXTENSIONS.md)
- [快速參考](./docs/01-Getting-Started/QUICK_REFERENCE.md)

### 外部資源

- [Gravito 框架文檔](https://github.com/gravito-framework/gravito)
- [DDD 指南](https://domaindriven.org/)
- [Bun 文檔](https://bun.sh/docs)

## 常見問題與排查

### Q: `bun dev` 報錯「Cannot find module」

**A**: 確保已執行 `bun link @gravito/core` 連接本地版本。

### Q: 修改 @gravito/core 後，gravito-ddd 沒有反映更改

**A**: 需要重建：
```bash
cd /Users/carl/Dev/Carl/gravito-core/packages/core && bun run build
```

### Q: 新模組無法自動註冊或路由未生效

**A**: 檢查以下幾點：
1. `src/Modules/{ModuleName}/index.ts` 是否正確導出 `IModuleDefinition`
2. `registerRoutes` 函數中，如果需要從容器取得服務（如 redis、database），應使用 try-catch 處理：
   ```typescript
   let service: any
   try {
     service = core.container.make('serviceName')
   } catch {
     // 服務不存在時優雅降級
     console.warn('Service not found, skipping routes')
     return
   }
   ```

### Q: 某個 HTTP 端點返回 404 Not Found

**A**: 檢查路由日誌。啟動伺服器時應看到：
```
[Router] Registering GET /your-route
[Router] Registering POST /your-route
```
如果沒有看到路由註冊日誌，表示 `registerRoutes` 沒有被執行。參考上面的「路由未生效」排查步驟。

## 開發最佳實踐

1. **先寫測試**：遵循 TDD（Test-Driven Development）
2. **保持分層**：嚴格分離 Domain/Application/Infrastructure 層
3. **定期重構**：Domain 層應簡潔且專注於業務邏輯
4. **文檔更新**：新增模組時更新相關文檔
5. **性能監控**：使用 Bun 的 profiler 檢測性能瓶頸

---

**更新於**: 2026-03-11
**Bun 版本**: 1.3.10+
**框架版本**: @gravito/core v2.0.1+
