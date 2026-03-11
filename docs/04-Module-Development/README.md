# 🔨 模組開發指南

完整的模組開發流程，從規劃到測試、文檔、部署。

---

## 📋 本分類包含

| 文檔 | 用途 |
|------|------|
| **[MODULE_GUIDE.md](./MODULE_GUIDE.md)** | ⭐ 從零開始建立模組的完整指南 |
| **[MODULE_GENERATION.md](./MODULE_GENERATION.md)** | 自動化模組生成工具說明 |
| **[NEW_MODULE_CHECKLIST.md](./NEW_MODULE_CHECKLIST.md)** | 新模組質量檢查清單 |
| **[MODULE_INTEGRATION.md](./MODULE_INTEGRATION.md)** | 多模組協作和整合 |
| **[MODULE_GENERATION_WITH_ADAPTERS.md](./MODULE_GENERATION_WITH_ADAPTERS.md)** | 進階：生成帶適配器的模組 |
| **[MODULE_ADD_CHECKLIST.md](./MODULE_ADD_CHECKLIST.md)** | 添加新模組到專案步驟 |

---

## 🚀 快速開始

### 自動生成模組 (1 分鐘)

```bash
# 生成簡單模組（in-memory）
bun run make:module Product

# 生成含數據庫的模組
bun run make:module Order --db

# 生成含 migration 和 seeder
bun run make:module Payment --migration
```

### 手動建立模組 (15 分鐘)

遵循 [MODULE_GUIDE.md](./MODULE_GUIDE.md) 逐步建立。

---

## 📖 推薦順序

### 如果使用自動生成
1. [MODULE_GENERATION.md](./MODULE_GENERATION.md) (5 min) - 了解工具
2. [MODULE_GUIDE.md](./MODULE_GUIDE.md) (15 min) - 理解結構
3. [NEW_MODULE_CHECKLIST.md](./NEW_MODULE_CHECKLIST.md) (10 min) - 驗證質量

### 如果手動建立
1. [MODULE_GUIDE.md](./MODULE_GUIDE.md) (30 min) - 完整流程
2. [../../03-DDD-Design/DDD_IMPLEMENTATION_CHECKLIST.md](../../03-DDD-Design/DDD_IMPLEMENTATION_CHECKLIST.md) (40 min) - DDD 檢查
3. [NEW_MODULE_CHECKLIST.md](./NEW_MODULE_CHECKLIST.md) (10 min) - 最終驗證

---

## 💡 模組結構

```
src/Modules/Product/
├── Domain/                      # 業務邏輯
│   ├── Aggregates/Product.ts
│   ├── Repositories/IProductRepository.ts
│   └── Services/ProductDomainService.ts
├── Application/                 # 應用層
│   ├── DTOs/ProductDTO.ts
│   └── Services/CreateProductService.ts
├── Infrastructure/              # 技術實現
│   ├── Persistence/ProductRepository.ts
│   └── Providers/ProductServiceProvider.ts
├── Presentation/                # HTTP 層
│   ├── Controllers/ProductController.ts
│   └── Routes/product.routes.ts
└── tests/                        # 測試
    ├── ProductRepository.test.ts
    └── ProductModule.test.ts
```

---

## 🎯 按場景快速查找

### "我想快速生成一個模組"
→ `bun run make:module <Name>`
→ [MODULE_GENERATION.md](./MODULE_GENERATION.md)

### "我想手動建立模組（自己控制）"
→ [MODULE_GUIDE.md](./MODULE_GUIDE.md)

### "我完成了，想檢查質量"
→ [NEW_MODULE_CHECKLIST.md](./NEW_MODULE_CHECKLIST.md)

### "我的模組需要數據庫"
→ `bun run make:module <Name> --db`
→ [../../05-Database-ORM/DATABASE.md](../../05-Database-ORM/DATABASE.md)

### "我的模組需要使用另一個模組"
→ [MODULE_INTEGRATION.md](./MODULE_INTEGRATION.md)
→ [../../03-DDD-Design/ACL_ANTI_CORRUPTION_LAYER.md](../../03-DDD-Design/ACL_ANTI_CORRUPTION_LAYER.md)

---

## ✅ 模組完成檢查清單

建立完模組後，檢查：

- [ ] Domain 層無外部依賴（除值物件）
- [ ] Repository 介面在 Domain，實現在 Infrastructure
- [ ] DTO 轉換規則清晰
- [ ] 至少 60% 測試覆蓋
- [ ] API 文檔完整
- [ ] 遵循命名規範
- [ ] 通過 TypeScript 檢查

詳見 [NEW_MODULE_CHECKLIST.md](./NEW_MODULE_CHECKLIST.md)

---

**快速導航**:
← [DDD 設計](../03-DDD-Design/)
→ [數據庫 ORM](../05-Database-ORM/)

最後更新: 2026-03-11
