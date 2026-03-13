# 🔌 適配器 & 接線層

框架整合層：將 DDD 架構與 Gravito 框架相連。

---

## 📋 本分類包含

| 文檔 | 用途 |
|------|------|
| **[ADAPTER_INFRASTRUCTURE_GUIDE.md](./ADAPTER_INFRASTRUCTURE_GUIDE.md)** | 基礎設施適配層設計與 Port 分類 |
| **[WIRING_GUIDE.md](./WIRING_GUIDE.md)** | 依賴組裝和模組註冊 |
| **[WIRING_QUICK_REFERENCE.md](./WIRING_QUICK_REFERENCE.md)** | 快速參考 |
| **[ADAPTER_INTEGRATION_EXAMPLES.md](./ADAPTER_INTEGRATION_EXAMPLES.md)** | 完整集成範例 |
| **[ADAPTERS_AND_EXTENSIONS.md](./ADAPTERS_AND_EXTENSIONS.md)** | 適配器設計模式 |
| **[SMART_FACTORY_OPTIMIZATION.md](./SMART_FACTORY_OPTIMIZATION.md)** | 工廠優化技巧 |
| **[INFRASTRUCTURE_DIRECTORY_STRUCTURE.md](./INFRASTRUCTURE_DIRECTORY_STRUCTURE.md)** | Infrastructure 層新目錄結構（2026-03-13） |

---

## 🎯 最近改進 (2026-03-13)

### Infrastructure 層結構優化 ✅

基礎設施層已完成重大重組，改善代碼組織和可維護性：

#### 新的 Ports/ 目錄結構
```
src/Shared/Infrastructure/Ports/
├── Core/
│   ├── ILogger.ts              # 統一日誌介面（取代所有 console.log）
│   └── IHealthCheck.ts          # 健康檢查介面
├── Database/
│   ├── IDatabaseAccess.ts       # ORM 無關數據庫訪問
│   └── IDatabaseConnectivityCheck.ts
├── Messaging/
│   ├── IEventDispatcher.ts      # 事件分發器介面
│   └── IDeadLetterQueue.ts      # 死信隊列介面
├── Services/
│   ├── IRedisService.ts         # Redis 快取介面
│   └── ICacheService.ts         # 應用層快取
└── Storage/
    └── IS3Service.ts            # S3 存儲介面（預留）
```

#### Adapters/ 按來源分類
```
src/Shared/Infrastructure/Adapters/
├── Gravito/                     # Gravito 框架適配器
├── RabbitMQ/                    # RabbitMQ 消息隊列適配
├── Redis/                       # Redis 快取適配
└── S3/                          # AWS S3 存儲適配（預留）
```

#### Events/ 事件系統獨立組織
```
src/Shared/Infrastructure/Events/
├── MemoryEventDispatcher.ts
├── RedisEventDispatcher.ts
├── RabbitMQEventDispatcher.ts
├── MemoryDeadLetterQueue.ts
└── RedisDeadLetterQueue.ts
```

### 品質改善
- ✅ **安全漏洞修復** - 消除 2 個 CRITICAL（XSS、容器遞迴）
- ✅ **日誌統一** - 74 個 console.log → ILogger
- ✅ **查詢錯誤不再沉默** - 改進異常傳播
- ✅ **Repository 去重** - 消除 ~300 行重複代碼

### 為何重組？
1. **可發現性** - 按功能而非隨意聚集
2. **可維護性** - 清晰的層級和責任邊界
3. **可擴展性** - 新增 Port/Adapter 時無需改動舊代碼
4. **框架無關性** - Port 介面完全獨立於 Gravito 框架

---

## 🎯 概述

**適配器層** 的職責：
- 將 Gravito 框架 → DDD 抽象層轉換
- 將 DDD 抽象層 → 具體實現轉換

**例子**：
- `GravitoModuleRouter` - Gravito 路由器 → `IModuleRouter` 介面
- `GravitoCacheAdapter` - Gravito Stasis → `ICacheService` 介面
- `UserRepository` - Domain 介面 → 數據庫實現

---

## 🏗️ Wiring 層結構

```
src/wiring/
├── DatabaseAccessBuilder.ts      # 創建 IDatabaseAccess
├── RepositoryFactory.ts          # ORM 選擇邏輯
├── RepositoryRegistry.ts         # 工廠註冊表
├── RepositoryFactoryGenerator.ts # 工廠生成工具
└── index.ts                       # 模組註冊匯出
```

**工作流程**:
1. `env.ORM` 決定使用哪個 ORM
2. `DatabaseAccessBuilder` 創建對應的 `IDatabaseAccess`
3. `RepositoryRegistry` 註冊所有 Repository 工廠
4. `ModuleServiceProvider` 組裝依賴
5. `wiring/index.ts` 匯出模組

---

## 📖 推薦閱讀順序

### 快速理解 (15 min)

1. **[WIRING_QUICK_REFERENCE.md](./WIRING_QUICK_REFERENCE.md)** (5 min)
2. **[WIRING_GUIDE.md](./WIRING_GUIDE.md)** (10 min) - 主要概念

### 深入實施 (30 min)

3. **[ADAPTER_INFRASTRUCTURE_GUIDE.md](./ADAPTER_INFRASTRUCTURE_GUIDE.md)** (20 min)
4. **[ADAPTER_INTEGRATION_EXAMPLES.md](./ADAPTER_INTEGRATION_EXAMPLES.md)** (10 min)

### 進階優化 (可選)

5. **[SMART_FACTORY_OPTIMIZATION.md](./SMART_FACTORY_OPTIMIZATION.md)** (15 min)

---

## 💡 核心概念

### 1. ORM 選擇點
```bash
# 單一 env 變數決定全應用的 ORM
ORM=memory bun run dev    # 開發用
ORM=drizzle bun run start # 生產用
ORM=atlas bun run start   # 高級生產
```

### 2. Repository 工廠
```typescript
// wiring/RepositoryFactory.ts
export function createRepository(name: string) {
  const orm = getCurrentORM()
  const db = getDatabaseAccess()
  
  return registry.create(name, orm, db)
}
```

### 3. 模組註冊
```typescript
// wiring/index.ts
export const registerUser = (core: PlanetCore) => {
  const repository = core.container.make('userRepository')
  const controller = new UserController(repository)
  registerUserRoutes(router, controller)
}
```

---

## 🎯 按需求查詢

### "我想理解接線層如何工作"
→ [WIRING_GUIDE.md](./WIRING_GUIDE.md)

### "我想快速查詢接線代碼"
→ [WIRING_QUICK_REFERENCE.md](./WIRING_QUICK_REFERENCE.md)

### "我想看完整的適配器示例"
→ [ADAPTER_INTEGRATION_EXAMPLES.md](./ADAPTER_INTEGRATION_EXAMPLES.md)

### "我想優化工廠性能"
→ [SMART_FACTORY_OPTIMIZATION.md](./SMART_FACTORY_OPTIMIZATION.md)

### "我要添加新的適配器"
→ [ADAPTER_INFRASTRUCTURE_GUIDE.md](./ADAPTER_INFRASTRUCTURE_GUIDE.md)

---

## ✅ 接線層檢查清單

添加新模組或更改 ORM 時：

- [ ] `ModuleServiceProvider.register()` 已實現
- [ ] Repository 工廠已註冊到 `RepositoryRegistry`
- [ ] 所有依賴都能從容器獲取
- [ ] ORM 變更時無需更改業務代碼
- [ ] 無硬編碼的 ORM 選擇
- [ ] 測試可注入 Mock `IDatabaseAccess`

---

**快速導航**:
← [數據庫 ORM](../05-Database-ORM/)
→ [生產部署](../07-Production-Deployment/)

最後更新: 2026-03-13
