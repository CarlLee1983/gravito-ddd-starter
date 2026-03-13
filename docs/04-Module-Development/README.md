# 🔨 模組開發指南

完整的模組開發流程，從規劃到測試、文檔、部署。

---

## 📋 本分類包含

| 文檔 | 用途 |
|------|------|
| **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** | ⭐ **核心指南**：從零開始建立模組、目錄結構與開發流程 |
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

1. **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** (20 min)
   - 理解標準目錄結構
   - 學習如何定義 Entity 與 Repository
2. **[../02-Architecture/CORE_DESIGN.md](../02-Architecture/CORE_DESIGN.md)** (15 min)
   - 理解分層依賴規則 (重要：禁止向上依賴)
   - 學習如何使用 DTO 進行層間數據傳遞
3. **[../06-Adapters-Wiring/WIRING_SYSTEM.md](../06-Adapters-Wiring/WIRING_SYSTEM.md)** (10 min)
   - 理解 `IModuleDefinition` 介面
   - 學習如何配置模組的服務提供者 (ServiceProvider)

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

### "我想快速生成一個模組"
→ 使用 `bun run generate:module <Name>` 命令。

### "我想手動建立模組"
→ 參考 [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) 的詳細步驟。

### "我的模組需要存取資料庫"
→ 參考 [../05-Database-ORM/ORM_GUIDE.md](../05-Database-ORM/ORM_GUIDE.md) 了解 IDatabaseAccess 的用法。

### "我的模組需要發送領域事件"
→ 參考 [../02-Architecture/EVENT_SYSTEM.md](../02-Architecture/EVENT_SYSTEM.md) 了解事件發布機制。

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

最後更新: 2026-03-13
