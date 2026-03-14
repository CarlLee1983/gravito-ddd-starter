# 🔨 模組開發指南

完整的模組開發流程，從規劃到測試、文檔、部署。

---

## 📋 本分類包含

| 文檔 | 用途 |
|------|------|
| **[MODULES_INVENTORY.md](./MODULES_INVENTORY.md)** | 📚 **現況清單**：10 個模組的詳細架構分析與依賴關係圖 |
| **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** | ⭐ **核心指南**：從零開始建立模組、目錄結構與開發流程 |
| **[SHOPPING_MODULES_GUIDE.md](./SHOPPING_MODULES_GUIDE.md)** | 🛒 **案例研究**：Cart/Product/Order/Payment 四模組協作深度分析 |
| **[../02-Architecture/CORE_DESIGN.md](../02-Architecture/CORE_DESIGN.md)** | 架構規範：分層責任與跨模組協作 (ACL) |
| **[../06-Adapters-Wiring/WIRING_SYSTEM.md](../06-Adapters-Wiring/WIRING_SYSTEM.md)** | 自動裝配：如何將新模組掛載到系統 |

---

## 🚀 快速開始

### 自動生成模組 (CLI 工具)

使用 Gravito DDD 提供的 CLI 工具快速生成符合規範的模組結構：

```bash
# 查看幫助
bun run generate:module --help

# 生成基礎模組 (含 Domain, Application, Presentation, Infrastructure)
bun run generate:module Product
```

### 手動建立模組

若需深度自定義，請遵循 [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) 的步驟手動建立各層檔案。

---

## 📖 推薦閱讀順序

1. **[MODULES_INVENTORY.md](./MODULES_INVENTORY.md)** (15 min) - 🆕 首先理解現有模組
   - 瞭解 10 個已有模組的架構
   - 認識跨模組依賴與事件流
   - 評估模組成熟度與最佳實踐

2. **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** (20 min)
   - 理解標準目錄結構
   - 學習如何定義 Entity 與 Repository
   - 參考現有模組作為實例

3. **[../02-Architecture/CORE_DESIGN.md](../02-Architecture/CORE_DESIGN.md)** (15 min)
   - 理解分層依賴規則 (重要：禁止向上依賴)
   - 學習如何使用 DTO 進行層間數據傳遞
   - 防腐層設計 (參考 Cart 模組案例)

4. **[SHOPPING_MODULES_GUIDE.md](./SHOPPING_MODULES_GUIDE.md)** (20 min) - 🆕 深度案例分析
   - 學習完整的購物流程事件鏈
   - 理解防腐層在實際中的應用
   - 研究 CQRS 和事件驅動的實現

5. **[../06-Adapters-Wiring/WIRING_SYSTEM.md](../06-Adapters-Wiring/WIRING_SYSTEM.md)** (10 min)
   - 理解 `IModuleDefinition` 介面
   - 學習如何配置模組的服務提供者 (ServiceProvider)
   - 自動裝配系統如何掛載模組

---

## 💡 模組目錄結構

```
app/Modules/Product/
├── index.ts                     # 模組導出定義 (IModuleDefinition)
├── README.md                    # 模組業務說明
├── Domain/                      # 領域層 (核心業務邏輯)
│   ├── Entities/                # 實體
│   ├── ValueObjects/            # 值物件
│   └── Repositories/            # Repository 介面 (Port)
├── Application/                 # 應用層 (使用案例)
│   ├── Services/                # 應用服務
│   └── DTOs/                    # 數據傳輸物件
├── Infrastructure/              # 基礎設施層 (技術實現)
│   ├── Repositories/            # Repository 具體實現 (Adapter)
│   └── Persistence/             # 資料庫 Schema (如果是 Drizzle)
└── Presentation/                # 表現層 (入口與通信)
    ├── Controllers/             # HTTP 控制器
    └── Routes/                  # 路由定義
```

---

## 🎯 按場景快速查找

### "我想瞭解現有的模組架構"
→ 參考 [MODULES_INVENTORY.md](./MODULES_INVENTORY.md) 的模組清單與依賴分析。

### "我想學習完整的購物系統實現"
→ 參考 [SHOPPING_MODULES_GUIDE.md](./SHOPPING_MODULES_GUIDE.md) 看 Cart/Product/Order/Payment 如何協作。

### "我想快速生成一個新模組"
→ 使用 `bun run generate:module <Name>` 命令。參考 [MODULES_INVENTORY.md](./MODULES_INVENTORY.md) 中的模組結構作為參考。

### "我想手動建立新模組"
→ 參考 [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) 的詳細步驟。對比 [MODULES_INVENTORY.md](./MODULES_INVENTORY.md) 中的現有模組結構確保一致性。

### "我的模組需要存取資料庫"
→ 參考 [../05-Database-ORM/ORM_GUIDE.md](../05-Database-ORM/ORM_GUIDE.md) 了解 IDatabaseAccess 的用法。User/Product 模組是很好的參考。

### "我的模組需要發送領域事件"
→ 參考 [../02-Architecture/EVENT_SYSTEM.md](../02-Architecture/EVENT_SYSTEM.md)。Cart/Order/Payment 模組的事件鏈是完整案例。

### "我的模組需要跨模組協作"
→ 參考 [SHOPPING_MODULES_GUIDE.md](./SHOPPING_MODULES_GUIDE.md) 的防腐層設計。Cart 依賴 Product、Order 監聽 Cart 是標準模式。

### "我需要實現 CQRS 讀側優化"
→ 參考 User 和 Product 模組的 ReadModel 實現。[MODULES_INVENTORY.md](./MODULES_INVENTORY.md) 標記了哪些模組使用了 CQRS。

---

## ✅ 模組開發檢查清單

- [ ] **領域獨立性**：Domain 層是否完全不依賴 `@gravito/core` 或 ORM 庫？
- [ ] **介面定義**：Repository 介面是否定義在 Domain 層，而實作在 Infrastructure？
- [ ] **數據傳遞**：表現層與應用層之間是否使用 DTO 傳遞數據？
- [ ] **自動裝配**：是否已在 `index.ts` 導出 `IModuleDefinition`？
- [ ] **單元測試**：領域邏輯是否具備 80% 以上的測試覆蓋率？

---

**快速導航**:
← [DDD 設計](../03-DDD-Design/)
→ [數據庫 ORM](../05-Database-ORM/)

---

## 📊 模組系統統計

| 指標 | 數值 |
|------|------|
| 總模組數 | 10 個 |
| TypeScript 檔案 | 201 個 |
| 完整 DDD 模組 | 8 個 |
| 應用層模組 | 2 個 |
| 總代碼行數 | ~15,000+ |
| 事件驅動模組 | 8 個 |
| CQRS 實現 | 2 個 (User, Product) |
| 跨模組依賴 | 5 條 |
| 平均測試覆蓋 | 92% |

---

最後更新: 2026-03-14
